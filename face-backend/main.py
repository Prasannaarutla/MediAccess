import io
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from insightface.app import FaceAnalysis

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="MediAccess Face Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load InsightFace Model ───────────────────────────────────────────────────
face_app = FaceAnalysis(name="buffalo_l")
face_app.prepare(ctx_id=0, det_size=(640, 640))

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "message": "MediAccess Face Backend running"}


@app.post("/extract-face")
async def extract_face(file: UploadFile = File(...)):
    """
    Accepts an image upload, extracts a face embedding using InsightFace.
    Returns the 512-dimensional embedding array.
    """
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image.")

        faces = face_app.get(img)

        if not faces:
            return {
                "face_detected": False,
                "embedding": None,
                "message": "No face detected in the image."
            }

        # Use the first detected face
        face = faces[0]
        embedding = face.embedding.tolist()

        return {
            "face_detected": True,
            "embedding": embedding,
            "message": "Face embedding extracted successfully."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
