# MediAccess Complete Production Deployment Guide

This guide provides step-by-step instructions for deploying the **MediAccess** monorepo to production using **Render** (for Node.js & Python FastAPI backend microservices) and **Vercel** (for the React + Vite frontend).

---

## 📋 Architecture Overview

| Service | Hosting Platform | Runtime | Subdirectory |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Vercel (or Render Static) | Node.js (Static SPA) | `frontend/` |
| **Main Backend** | Render Web Service | Node.js (Express) | `backend/` |
| **Face Microservice** | Render Web Service | Python (FastAPI + InsightFace) | `face-backend/` |
| **Database** | Firebase Realtime DB | Managed Cloud DB | N/A |
| **Storage** | AWS S3 | Object Storage | N/A |

---

## 🚀 Step 1: Deploy Backend Services on Render

### Method A: Automated Deployment via `render.yaml` (Recommended)

1. Push your repository to **GitHub**.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository (`Prasannaarutla/MediAccess`).
5. Render will automatically detect `render.yaml` and configure both services:
   - `mediaccess-face-backend` (Python FastAPI)
   - `mediaccess-node-backend` (Node.js Express)
6. Fill in the environment variables when prompted:
   - `AWS_ACCESS_KEY_ID`: Your AWS IAM access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS IAM secret key
   - `AWS_BUCKET_NAME`: Your S3 bucket name
   - `AWS_REGION`: e.g., `ap-south-1`
   - `ALLOWED_ORIGINS`: `https://your-frontend-domain.vercel.app`
7. Click **Apply**.

---

### Method B: Manual Render Setup

#### Service 1: `mediaccess-node-backend`
- **Type**: Web Service
- **Root Directory**: `backend`
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/`
- **Environment Variables**:
  - `PORT`: `10000`
  - `AWS_ACCESS_KEY_ID`: `<your_access_key>`
  - `AWS_SECRET_ACCESS_KEY`: `<your_secret_key>`
  - `AWS_REGION`: `ap-south-1`
  - `AWS_BUCKET_NAME`: `<your_bucket_name>`
  - `ALLOWED_ORIGINS`: `*` (or your Vercel URL)

#### Service 2: `mediaccess-face-backend`
- **Type**: Web Service
- **Root Directory**: `face-backend`
- **Environment**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/`
- **Environment Variables**:
  - `ALLOWED_ORIGINS`: `*` (or your Vercel URL)

> **Note on Initial Cold Start**: The Python service downloads the InsightFace `buffalo_l` AI model on first launch. Allow ~2-3 minutes for the initial build and model initialization to finish.

---

## 🌐 Step 2: Deploy Frontend on Vercel

1. Log into [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`Prasannaarutla/MediAccess`).
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: Select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add **Environment Variables**:
   - `VITE_BACKEND_URL`: `https://mediaccess-node-backend.onrender.com` (Your Render Node URL)
   - `VITE_FACE_BACKEND_URL`: `https://mediaccess-face-backend.onrender.com` (Your Render Python URL)
   - `VITE_FACE_MATCH_THRESHOLD`: `0.6`
6. Click **Deploy**.

---

## 🔐 Step 3: Security & CORS Verification

1. **Camera HTTPS Requirement**: Browsers block webcam access on insecure (`http://`) sites outside `localhost`. Vercel automatically supplies free SSL (`https://`), enabling face capture out-of-the-box.
2. **CORS Update**: Once your Vercel production URL is live (e.g. `https://mediaccess.vercel.app`), update `ALLOWED_ORIGINS` in both Render services to restrict cross-origin access strictly to your frontend domain.

---

## ✅ Step 4: Verification Checklist

- [ ] Node Backend Health: `https://<your-node-backend>.onrender.com/` returns `"Backend running"`
- [ ] Face Backend Health: `https://<your-face-backend>.onrender.com/` returns `{"status":"ok", ...}`
- [ ] Vercel Frontend: Open `https://<your-frontend>.vercel.app`
- [ ] Test Patient Registration & Webcam capture
- [ ] Test Receptionist scan check-in
- [ ] Test Document Upload & Pre-signed URL retrieval
