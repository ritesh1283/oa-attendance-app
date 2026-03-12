import os
import random
import json
import requests
from tqdm import tqdm

API_URL = "http://localhost:8000"

DATASET_PATH = "/home/leaf/Downloads/archive/lfw-deepfunneled/lfw-deepfunneled"

MAX_PEOPLE = 50

# must match your API env variable
THRESHOLD = 0.60

TP = FP = TN = FN = 0


def register_face(img_path):
    with open(img_path, "rb") as f:
        files = {"image": f}

        r = requests.post(
            f"{API_URL}/api/face/register",
            files=files
        )

    data = r.json()

    if not data.get("success"):
        return None

    return data["embedding"]


def verify_face(img_path, embedding):
    with open(img_path, "rb") as f:
        files = {"image": f}

        data = {
            "embedding": json.dumps(embedding),
            "liveness_required": "false"
        }

        r = requests.post(
            f"{API_URL}/api/face/verify",
            files=files,
            data=data
        )

    return r.json()


# -----------------------------
# LOAD DATASET
# -----------------------------
people = []

for person in os.listdir(DATASET_PATH):

    person_dir = os.path.join(DATASET_PATH, person)

    if not os.path.isdir(person_dir):
        continue

    imgs = os.listdir(person_dir)

    if len(imgs) >= 2:
        people.append(person)


print("People with >=2 images:", len(people))

people = random.sample(people, min(MAX_PEOPLE, len(people)))

print("People used:", len(people))


# -----------------------------
# TEST LOOP
# -----------------------------
for person in tqdm(people):

    person_dir = os.path.join(DATASET_PATH, person)

    imgs = os.listdir(person_dir)

    img1 = os.path.join(person_dir, imgs[0])
    img2 = os.path.join(person_dir, imgs[1])

    embedding = register_face(img1)

    if embedding is None:
        continue

    # -------- SAME PERSON TEST --------
    res = verify_face(img2, embedding)

    if not res.get("success"):
        continue

    dist = res.get("similarity", 999)

    is_match = dist <= THRESHOLD

    if is_match:
        TP += 1
    else:
        FN += 1


    # -------- DIFFERENT PERSON TEST --------
    other = random.choice([p for p in people if p != person])

    other_dir = os.path.join(DATASET_PATH, other)

    other_img = os.path.join(other_dir, os.listdir(other_dir)[0])

    res = verify_face(other_img, embedding)

    if not res.get("success"):
        continue

    dist = res.get("similarity", 999)

    is_match = dist <= THRESHOLD

    if is_match:
        FP += 1
    else:
        TN += 1


# -----------------------------
# METRICS
# -----------------------------
total = TP + TN + FP + FN

accuracy = (TP + TN) / total if total else 0
far = FP / (FP + TN) if (FP + TN) else 0
frr = FN / (FN + TP) if (FN + TP) else 0


print("\n===== RESULTS =====")

print("TP:", TP)
print("TN:", TN)
print("FP:", FP)
print("FN:", FN)

print("\nAccuracy:", round(accuracy * 100, 2), "%")
print("FAR:", round(far * 100, 3), "%")
print("FRR:", round(frr * 100, 3), "%")


