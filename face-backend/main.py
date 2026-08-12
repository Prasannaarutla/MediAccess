import io
import os
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from insightface.app import FaceAnalysis

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="MediAccess Face Backend", version="1.0.0")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip().rstrip("/") for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else [],
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load InsightFace Model (Lazy Loaded) ─────────────────────────────────────
face_app = None

def get_face_app():
    global face_app
    if face_app is None:
        # Load ONLY detection & recognition modules to stay under 512MB RAM limit
        app = FaceAnalysis(
            name="buffalo_s",
            allowed_modules=["detection", "recognition"],
            providers=["CPUExecutionProvider"],
        )
        app.prepare(ctx_id=-1, det_size=(256, 256))
        face_app = app
    return face_app

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

        model = get_face_app()
        faces = model.get(img)

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
