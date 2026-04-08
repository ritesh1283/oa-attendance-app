"""
OA Attendance — Python Face Recognition Microservice
=====================================================
Runs as a FastAPI HTTP server on port 8000.
Node.js backend calls this service for two operations:

  POST /api/face/register  — Model 2: extract 128-dim embedding from image
  POST /api/face/verify    — Model 1: compare live image vs stored embedding

Models used:
  face_recognition library (dlib ResNet-34 backbone, 128-dim embedding)
  OpenCV for preprocessing, CLAHE, denoising, gamma correction
  dlib 68-point landmarks for EAR-based liveness detection

Accuracy: 99.38% on LFW benchmark (face_recognition / dlib)
CPU inference: ~200-600ms per image on a modern laptop
"""

import os, time, json, logging
from typing import Optional
import numpy as np
import cv2
import dlib
import face_recognition
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from scipy.spatial.distance import cosine
import uvicorn

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("face-service")

# Config
SERVICE_SECRET         = os.getenv("PYTHON_SERVICE_SECRET", "")
FACE_MATCH_THRESHOLD   = float(os.getenv("FACE_MATCH_THRESHOLD", "0.40"))   # cosine DISTANCE threshold
LIVENESS_EAR_THRESHOLD = float(os.getenv("LIVENESS_EAR_THRESHOLD", "0.22"))
MIN_FACE_SIZE          = int(os.getenv("MIN_FACE_SIZE", "50"))
PORT                   = int(os.getenv("PORT", "8000"))

app = FastAPI(title="OA Face Recognition Service", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

LANDMARK_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "shape_predictor_68_face_landmarks.dat")
landmark_predictor: Optional[dlib.shape_predictor] = None
dlib_detector = None

@app.on_event("startup")
def load_models():
    global landmark_predictor, dlib_detector
    if os.path.exists(LANDMARK_MODEL_PATH):
        landmark_predictor = dlib.shape_predictor(LANDMARK_MODEL_PATH)
        dlib_detector      = dlib.get_frontal_face_detector()
        log.info("dlib 68-point landmark model loaded — liveness ACTIVE")
    else:
        log.warning("shape_predictor_68_face_landmarks.dat NOT FOUND — liveness DISABLED")
        log.warning("Download: http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2")

# ──────────────────────────────────────────────────────────────────────────────
# PREPROCESSING
# Makes recognition robust to low lighting, blur, poor quality images
# ──────────────────────────────────────────────────────────────────────────────
def preprocess_image(bgr_img: np.ndarray) -> np.ndarray:
    """
    Pipeline:
    1. Resize      - keep max dimension <= 800px (speed + memory)
    2. Denoise     - remove sensor noise and JPEG artifacts
    3. CLAHE       - fix uneven/poor lighting (on LAB L-channel only)
    4. Auto-gamma  - brighten dark images
    5. Sharpen     - recover detail lost to blur
    """
    img = bgr_img.copy()

    # 1. Resize
    h, w = img.shape[:2]
    if max(h, w) > 800:
        scale = 800 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # 2. Denoise
    img = cv2.bilateralFilter(img, 5, 75, 75)

    # 3. CLAHE on luminance channel
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    img = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

    # 4. Auto-gamma — brighten if mean luminance < 100
    gray_mean = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).mean()
    if gray_mean < 100:
        gamma = max(0.5, min(2.5, np.log(128) / np.log(max(gray_mean, 1))))
        lut = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)], dtype=np.uint8)
        img = cv2.LUT(img, lut)

    # 5. Unsharp mask (sharpen)
    blur = cv2.GaussianBlur(img, (0, 0), 3)
    img = cv2.addWeighted(img, 1.5, blur, -0.5, 0)

    return img


def bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Cannot decode image. Ensure it is a valid JPEG or PNG.")
    return img


# ──────────────────────────────────────────────────────────────────────────────
# FACE EMBEDDING — dlib ResNet-34 via face_recognition
# ──────────────────────────────────────────────────────────────────────────────
def extract_embedding(bgr_img: np.ndarray):
    """
    MATHEMATICS:
    - dlib ResNet-34 maps a face image to a 128-dimensional vector
    - Trained with Triplet Loss: d(anchor, positive) < d(anchor, negative) + margin
    - Similar faces cluster together; different people are far apart
    - num_jitters=3: average embedding over 3 small augmentations → more stable

    Returns: (embedding: list[128 floats], confidence: float, face_loc: tuple)
    """

    # Ensure correct image format for dlib
    if bgr_img is None:
        raise ValueError("Image decoding failed")

# Convert to uint8 if preprocessing produced float
    if bgr_img.dtype != np.uint8:
        bgr_img = np.clip(bgr_img, 0, 255).astype(np.uint8)

# Remove alpha channel if present
    if len(bgr_img.shape) == 3 and bgr_img.shape[2] == 4:
        bgr_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGRA2BGR)

# Convert grayscale to BGR
    if len(bgr_img.shape) == 2:
        bgr_img = cv2.cvtColor(bgr_img, cv2.COLOR_GRAY2BGR)

    rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    
    # number_of_times_to_upsample=2 improves detection of small/distant faces
    face_locations = face_recognition.face_locations(rgb_img, model="hog", number_of_times_to_upsample=2)

    if not face_locations:
        raise ValueError("No face detected. Ensure face is clearly visible and well-lit.")
    if len(face_locations) > 1:
        raise ValueError("Multiple faces detected. Only one person should be in frame.")

    loc = face_locations[0]
    top, right, bottom, left = loc
    face_w = right - left
    face_h = bottom - top

    if face_w < MIN_FACE_SIZE or face_h < MIN_FACE_SIZE:
        raise ValueError(f"Face too small ({face_w}x{face_h}px). Please move closer to the camera.")

    # num_jitters=3 averages over 3 randomly jittered versions for stability
    encodings = face_recognition.face_encodings(rgb_img, known_face_locations=[loc], num_jitters=3)
    if not encodings:
        raise ValueError("Could not extract face features. Please retake the photo in better light.")

    embedding  = encodings[0].tolist()
    confidence = min(1.0, max(face_w, face_h) / 200.0)

    return embedding, confidence, loc


def calculate_euclidean_distance(vec_a: list, vec_b: list) -> float:
    """
    MATHEMATICS — Euclidean Distance:
    - dlib face embeddings are trained using Euclidean distance (Triplet Loss).
    - Range: 0.0 (identical) to ~1.2 (different)
    - dlib standard threshold: <= 0.60 is a match.
    """
    a = np.array(vec_a, dtype=np.float64)
    b = np.array(vec_b, dtype=np.float64)
    return float(np.linalg.norm(a - b))


# ──────────────────────────────────────────────────────────────────────────────
# LIVENESS DETECTION — Eye Aspect Ratio (EAR)
# ──────────────────────────────────────────────────────────────────────────────
def eye_aspect_ratio(eye_pts: np.ndarray) -> float:
    """
    EAR (Soukupova & Cech, 2016):
        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

    Landmark indices (dlib 68-point):
        Left eye:  36, 37, 38, 39, 40, 41
        Right eye: 42, 43, 44, 45, 46, 47

    p1=corner, p4=corner (horizontal span)
    p2,p3 = upper lid  p5,p6 = lower lid (vertical spans)

    EAR > 0.22 = eyes open = live person
    EAR < 0.18 = eyes closed or printed photo (spoof attempt)
    """
    A = np.linalg.norm(eye_pts[1] - eye_pts[5])
    B = np.linalg.norm(eye_pts[2] - eye_pts[4])
    C = np.linalg.norm(eye_pts[0] - eye_pts[3])
    return float((A + B) / (2.0 * C))


def compute_liveness(bgr_img: np.ndarray, face_loc: tuple):
    """Returns (ear_score, passed, reason)"""
    if landmark_predictor is None:
        return 0.30, True, "liveness_disabled"

    top, right, bottom, left = face_loc
    gray  = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
    rect  = dlib.rectangle(left, top, right, bottom)
    shape = landmark_predictor(gray, rect)
    pts   = np.array([[shape.part(i).x, shape.part(i).y] for i in range(68)])

    left_ear  = eye_aspect_ratio(pts[36:42])
    right_ear = eye_aspect_ratio(pts[42:48])
    avg_ear   = (left_ear + right_ear) / 2.0
    passed    = avg_ear >= LIVENESS_EAR_THRESHOLD
    reason    = "liveness_passed" if passed else f"eyes_closed_ear_{avg_ear:.3f}"

    return avg_ear, passed, reason


# ──────────────────────────────────────────────────────────────────────────────
# SECURITY MIDDLEWARE
# ──────────────────────────────────────────────────────────────────────────────
@app.middleware("http")
async def check_secret(request: Request, call_next):
    if request.url.path in ("/health", "/", "/docs", "/openapi.json"):
        return await call_next(request)
    if SERVICE_SECRET:
        if request.headers.get("X-Service-Secret", "") != SERVICE_SECRET:
            return JSONResponse(status_code=401, content={"success": False, "error": "Unauthorized"})
    return await call_next(request)


# ──────────────────────────────────────────────────────────────────────────────
# ROUTE: GET /health
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "oa-face-recognition",
        "liveness_model": "loaded" if landmark_predictor else "disabled",
        "face_match_threshold_distance": FACE_MATCH_THRESHOLD,
        "face_match_threshold_similarity": round(1 - FACE_MATCH_THRESHOLD, 2),
        "liveness_ear_threshold": LIVENESS_EAR_THRESHOLD,
    }


# ──────────────────────────────────────────────────────────────────────────────
# ROUTE: POST /api/face/register  (MODEL 2 — Extract Embedding)
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/api/face/register")
async def register_face(image: UploadFile = File(...)):
    """
    Input : image file (JPEG/PNG)
    Output: 128-dimensional face embedding as JSON array

    Node.js stores JSON.stringify(embedding) in MySQL face_token column.
    The original photo is NEVER stored — only the 128 floats.
    """
    t0 = time.time()
    try:
        image_bytes = await image.read()
        bgr = bytes_to_bgr(image_bytes)
        bgr = preprocess_image(bgr)

        embedding, confidence, face_loc = extract_embedding(bgr)
        ear, liveness_passed, liveness_reason = compute_liveness(bgr, face_loc)

        top, right, bottom, left = face_loc
        ms = int((time.time() - t0) * 1000)

        log.info(f"REGISTER  conf={confidence:.2f}  ear={ear:.3f}  liveness={liveness_passed}  {ms}ms")

        return {
            "success":            True,
            "embedding":          embedding,         # 128 floats — store in DB as JSON
            "confidence":         round(confidence, 3),
            "liveness_ear":       round(ear, 4),
            "liveness_passed":    liveness_passed,
            "face_size":          max(right - left, bottom - top),
            "processing_time_ms": ms,
        }

    except ValueError as e:
        log.warning(f"REGISTER FAIL: {e}")
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    except Exception as e:
        log.error(f"REGISTER ERROR: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": "Internal error during registration"})


# ──────────────────────────────────────────────────────────────────────────────
# ROUTE: POST /api/face/verify  (MODEL 1 — Compare & Verify)
# ──────────────────────────────────────────────────────────────────────────────
@app.post("/api/face/verify")
async def verify_face(
    image: UploadFile = File(...),
    embedding: str = Form(...),
    liveness_required: str = Form("true"),
):
    """
    Input : image file (live capture) + stored embedding (128-float JSON array)
    Output: { verified, similarity, similarity_percent, liveness_score, reason }

    Decision logic:
    1. Preprocess live image
    2. Extract 128-dim embedding from live image
    3. Liveness check (EAR) — reject if eyes closed and liveness_required=true
    4. Cosine similarity vs stored embedding
    5. verified = liveness_passed AND similarity >= threshold
    """
    t0 = time.time()
    try:
        # Parse stored embedding
        try:
            stored = json.loads(embedding)
        except json.JSONDecodeError:
            return JSONResponse(status_code=400, content={
                "success": False, "error": "Invalid embedding. Student must re-register."
            })

        if not isinstance(stored, list) or len(stored) != 128:
            return JSONResponse(status_code=400, content={
                "success": False,
                "error": f"Embedding must be list of 128 floats. Got {type(stored).__name__} length {len(stored) if isinstance(stored, list) else '?'}. Student must re-register."
            })

        # Process live image
        image_bytes = await image.read()
        bgr = bytes_to_bgr(image_bytes)
        bgr = preprocess_image(bgr)

        live_embedding, confidence, face_loc = extract_embedding(bgr)

        # Liveness
        ear, liveness_passed, liveness_reason = compute_liveness(bgr, face_loc)
        require_liveness = liveness_required.lower() == "true"

        if require_liveness and not liveness_passed:
            ms = int((time.time() - t0) * 1000)
            log.warning(f"VERIFY LIVENESS FAIL  ear={ear:.3f}  {ms}ms")
            return {
                "success":            True,
                "verified":           False,
                "similarity":         0.0,
                "similarity_percent": 0,
                "liveness_score":     round(ear, 4),
                "liveness_passed":    False,
                "confidence":         round(confidence, 3),
                "reason":             f"Liveness check failed (EAR={ear:.3f}). Please blink naturally and try again.",
                "processing_time_ms": ms,
            }

            

        # Face comparison
        t0 = time.time()
        distance = calculate_euclidean_distance(live_embedding, stored)

        # Dlib's standard threshold operates on distance, not similarity. 
        # Lower distance = closer match.
        dist_thresh = 0.60  
        is_match = distance <= dist_thresh

        # Convert distance to a human-readable similarity score (0.0 to 1.0)
        # Since a completely different face is ~1.2 distance, we normalize against 1.2.
        # Using max() ensures we don't get negative percentages.
        similarity = max(0.0, 1.0 - (distance / 1.2))

        reason = "verified" if is_match else f"face_mismatch (distance={distance:.3f}, need<={dist_thresh:.2f})"
        ms = int((time.time() - t0) * 1000)

        log.info(f"VERIFY {'OK' if is_match else 'FAIL'}  dist={distance:.3f}  ear={ear:.3f}  {ms}ms")
        
        return {
            "success":            True,
            "verified":           is_match,
            "distance":           round(distance, 4),               # Added this for debugging transparency
            "similarity_percent": round(similarity * 100, 1),       # Now guaranteed to be 0% to 100%
            "liveness_score":     round(ear, 4),
            "liveness_passed":    liveness_passed,
            "confidence":         round(confidence, 3),
            "reason":             reason,
            "processing_time_ms": ms,
        }


    except ValueError as e:
        log.warning(f"VERIFY FAIL: {e}")
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    except Exception as e:
        log.error(f"VERIFY ERROR: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": "Internal error during verification"})


if __name__ == "__main__":
    log.info(f"Starting on port {PORT}")
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False, workers=1)
