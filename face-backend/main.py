import io
import os
import urllib.request
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="MediAccess Face Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Download Lightweight OpenCV YuNet & SFace Models ─────────────────────────
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YUNET_PATH = os.path.join(BASE_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(BASE_DIR, "face_recognition_sface_2021dec.onnx")

def ensure_models():
    if not os.path.exists(YUNET_PATH):
        print("Downloading YuNet face detector model (~230KB)...")
        urllib.request.urlretrieve(YUNET_URL, YUNET_PATH)
    if not os.path.exists(SFACE_PATH):
        print("Downloading SFace face recognizer model (~36MB)...")
        urllib.request.urlretrieve(SFACE_URL, SFACE_PATH)

ensure_models()

# Initialize OpenCV native face detector & recognizer (<40MB RAM usage)
detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 320), 0.6, 0.3, 5000)
recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "message": "MediAccess Face Backend running with OpenCV SFace"}


@app.post("/extract-face")
async def extract_face(file: UploadFile = File(...)):
    """
    Accepts an image upload, detects face using YuNet and extracts a face embedding vector using SFace.
    """
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        h, w, _ = img.shape
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)

        if faces is None or len(faces) == 0:
            return {
                "face_detected": False,
                "embedding": None,
                "message": "No face detected in the image."
            }

        # Align face and extract feature embedding
        aligned_face = recognizer.alignCrop(img, faces[0])
        feature = recognizer.feature(aligned_face)
        embedding = feature[0].tolist()

        return {
            "face_detected": True,
            "embedding": embedding,
            "message": "Face embedding extracted successfully."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
