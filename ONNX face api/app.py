"""
OA Attendance — Python Face Recognition Microservice (PRO EDITION)
==================================================================
Engine Switch: 
 - InsightFace (ONNX) for detection and 512-dim embeddings.
 - MediaPipe for 468-point mesh liveness detection.
"""

import os, time, json, logging
import numpy as np
import cv2
import mediapipe as mp
from insightface.app import FaceAnalysis
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("face-service")

SERVICE_SECRET         = os.getenv("PYTHON_SERVICE_SECRET", "")
# ArcFace uses Cosine Similarity (1.0 = identical, 0.0 = orthogonal). 
# > 0.45 is the standard threshold for a positive match in buffalo_l.
FACE_MATCH_THRESHOLD   = float(os.getenv("FACE_MATCH_THRESHOLD", "0.45"))
LIVENESS_EAR_THRESHOLD = float(os.getenv("LIVENESS_EAR_THRESHOLD", "0.22"))
MIN_FACE_SIZE          = int(os.getenv("MIN_FACE_SIZE", "50"))
PORT                   = int(os.getenv("PORT", "8000"))

app = FastAPI(title="OA Face Service (InsightFace + ONNX)", version="4.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ──────────────────────────────────────────────────────────────────────────────
# AI ENGINE INITIALIZATION
# ──────────────────────────────────────────────────────────────────────────────

# 1. InsightFace (Embeddings)
# 'buffalo_l' is the standard highly accurate model. 
# NOTE: The first time you run this script, it will download ~300MB of ONNX models to ~/.insightface/models/
log.info("Initializing InsightFace ONNX Runtime...")
face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

# 2. MediaPipe (Liveness)
mp_face_mesh = mp.python.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5
)
RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144] 
LEFT_EYE_INDICES  = [362, 385, 387, 263, 373, 380]


# ──────────────────────────────────────────────────────────────────────────────
# PREPROCESSING & UTILS
# ──────────────────────────────────────────────────────────────────────────────
def bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None: raise ValueError("Cannot decode image.")
    return img

def preprocess_image(bgr_img: np.ndarray) -> np.ndarray:
    """InsightFace is highly robust. We only need basic resizing and gamma correction."""
    img = bgr_img.copy()
    h, w = img.shape[:2]
    if max(h, w) > 800:
        scale = 800 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    gray_mean = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).mean()
    if gray_mean < 100:
        gamma = max(0.5, min(2.5, np.log(128) / np.log(max(gray_mean, 1))))
        lut = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)], dtype=np.uint8)
        img = cv2.LUT(img, lut)
    return img


# ──────────────────────────────────────────────────────────────────────────────
# CORE AI FUNCTIONS
# ──────────────────────────────────────────────────────────────────────────────
def extract_embedding(bgr_img: np.ndarray):
    """Uses InsightFace to find face and extract 512-dim ArcFace embedding."""
    faces = face_app.get(bgr_img)

    if len(faces) == 0: raise ValueError("No face detected.")
    if len(faces) > 1: raise ValueError("Multiple faces detected. Only one person allowed.")

    face = faces[0]
    bbox = face.bbox # [left, top, right, bottom]
    face_w = bbox[2] - bbox[0]
    face_h = bbox[3] - bbox[1]

    if face_w < MIN_FACE_SIZE or face_h < MIN_FACE_SIZE:
        raise ValueError(f"Face too small ({int(face_w)}x{int(face_h)}px). Move closer.")

    # normed_embedding is automatically L2 normalized (essential for Cosine Similarity)
    embedding = face.normed_embedding.tolist()
    confidence = float(face.det_score)

    return embedding, confidence, bbox

def calculate_cosine_similarity(vec_a: list, vec_b: list) -> float:
    """
    Because InsightFace returns L2-normalized embeddings, the dot product
    is exactly equal to the cosine similarity. 
    Range: -1.0 to 1.0. Higher is better.
    """
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    return float(np.dot(a, b))

def compute_ear_mediapipe(landmarks, indices, img_w, img_h):
    pts = [np.array([landmarks[i].x * img_w, landmarks[i].y * img_h]) for i in indices]
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    C = np.linalg.norm(pts[0] - pts[3])
    if C == 0: return 0.0
    return float((A + B) / (2.0 * C))

def compute_liveness(bgr_img: np.ndarray):
    rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_img)
    if not results.multi_face_landmarks:
        return 0.0, False, "no_face_mesh_detected"

    landmarks = results.multi_face_landmarks[0].landmark
    h, w = bgr_img.shape[:2]
    right_ear = compute_ear_mediapipe(landmarks, RIGHT_EYE_INDICES, w, h)
    left_ear  = compute_ear_mediapipe(landmarks, LEFT_EYE_INDICES, w, h)
    
    avg_ear = (left_ear + right_ear) / 2.0
    passed = avg_ear >= LIVENESS_EAR_THRESHOLD
    return avg_ear, passed


# ──────────────────────────────────────────────────────────────────────────────
# WORKERS & HTTP ROUTES
# ──────────────────────────────────────────────────────────────────────────────
def run_pipeline_cpu(image_bytes: bytes):
    bgr = preprocess_image(bytes_to_bgr(image_bytes))
    embedding, confidence, bbox = extract_embedding(bgr)
    ear, liveness_passed = compute_liveness(bgr)
    return embedding, confidence, bbox, ear, liveness_passed

@app.middleware("http")
async def check_secret(request: Request, call_next):
    if request.url.path in ("/health", "/", "/docs", "/openapi.json"): return await call_next(request)
    if SERVICE_SECRET and request.headers.get("X-Service-Secret", "") != SERVICE_SECRET:
        return JSONResponse(status_code=401, content={"success": False, "error": "Unauthorized"})
    return await call_next(request)

@app.post("/api/face/register")
async def register_face(image: UploadFile = File(...)):
    t0 = time.time()
    try:
        embedding, conf, bbox, ear, passed = await run_in_threadpool(run_pipeline_cpu, await image.read())
        ms = int((time.time() - t0) * 1000)
        
        log.info(f"REGISTER conf={conf:.2f} ear={ear:.3f} {ms}ms")
        return {
            "success": True, 
            "embedding": embedding, # This is now 512 floats!
            "confidence": round(conf, 3),
            "liveness_ear": round(ear, 4), 
            "liveness_passed": passed, 
            "processing_time_ms": ms
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})

@app.post("/api/face/verify")
async def verify_face(image: UploadFile = File(...), embedding: str = Form(...), liveness_required: str = Form("true")):
    t0 = time.time()
    try:
        stored = json.loads(embedding)
        if len(stored) != 512:
            return JSONResponse(status_code=400, content={"success": False, "error": f"Requires 512-dim embedding, got {len(stored)}."})

        live_embed, conf, bbox, ear, passed = await run_in_threadpool(run_pipeline_cpu, await image.read())

        if liveness_required.lower() == "true" and not passed:
            return {
                "success": True, "verified": False, "similarity_percent": 0,
                "liveness_score": round(ear, 4), "liveness_passed": False,
                "reason": f"Liveness check failed (EAR={ear:.3f}).", "processing_time_ms": int((time.time() - t0) * 1000)
            }

        # Compare 512-dim vectors using Cosine Similarity
        similarity = calculate_cosine_similarity(live_embed, stored)
        is_match = similarity >= FACE_MATCH_THRESHOLD
        
        ms = int((time.time() - t0) * 1000)
        log.info(f"VERIFY {'OK' if is_match else 'FAIL'} sim={similarity:.3f} ear={ear:.3f} {ms}ms")
        
        return {
            "success": True, 
            "verified": is_match, 
            "similarity": round(similarity, 4),
            "similarity_percent": min(100.0, round(max(0.0, similarity) * 100, 1)),
            "liveness_score": round(ear, 4), 
            "liveness_passed": passed, 
            "reason": "verified" if is_match else "mismatch",
            "processing_time_ms": ms
        }
    except Exception as e:
        log.error(f"VERIFY ERROR: {e}")
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False, workers=1)