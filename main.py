import os
import io
import threading
from typing import List, Dict, Any

import numpy as np
import librosa
import torch
from transformers import AutoProcessor, AutoModelForAudioClassification
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Model configuration
MODEL_ID = "preszzz/drone-audio-detection-05-12"
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

# Global variables for model caching
_processor = None
_model = None
_device = "cpu"
_model_lock = threading.Lock()

def ensure_model():
    """Lazily load the processor & model once and cache them."""
    global _processor, _model, _device

    if _model is not None and _processor is not None:
        return _processor, _model, _device, None

    with _model_lock:
        if _model is not None and _processor is not None:
            return _processor, _model, _device, None

        try:
            print("Loading model:", MODEL_ID)
            if HF_TOKEN:
                processor = AutoProcessor.from_pretrained(MODEL_ID, token=HF_TOKEN)
                model = AutoModelForAudioClassification.from_pretrained(MODEL_ID, token=HF_TOKEN)
            else:
                processor = AutoProcessor.from_pretrained(MODEL_ID)
                model = AutoModelForAudioClassification.from_pretrained(MODEL_ID)

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)
            model.eval()

            _processor, _model, _device = processor, model, device
            print("Model loaded on", device)
            return _processor, _model, _device, None
        except Exception as e:
            err = f"Failed to load model: {e}"
            print(err)
            return None, None, None, err

def predict_with_local_model(processor, model, device, audio, sr, chunk_s=5):
    """Split audio into chunks, classify each, return results."""
    results = []
    target_sr = 16000

    if sr != target_sr:
        print(f"Resampling from {sr} -> {target_sr}")
        audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
        sr = target_sr

    chunk_len = chunk_s * sr
    for i in range(0, len(audio), chunk_len):
        chunk = audio[i:i + chunk_len]
        if len(chunk) < sr:  # skip very small chunks
            continue

        inputs = processor(chunk, sampling_rate=sr, return_tensors="pt", padding=True)
        with torch.no_grad():
            logits = model(inputs.input_values.to(device)).logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]

        label_id = int(torch.argmax(probs))
        label = model.config.id2label[label_id]
        score = float(probs[label_id])

        results.append({
            "chunk": i // chunk_len,
            "label": label,
            "score": score,
            "all": {model.config.id2label[j]: float(p) for j, p in enumerate(probs)}
        })

    return results

# FastAPI app
app = FastAPI(title="Drone Sound Detection API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassificationResult(BaseModel):
    chunk: int
    label: str
    score: float
    all: Dict[str, float]

class ProcessResponse(BaseModel):
    filename: str
    waveform_data: List[float]
    classification: str
    all_predictions: List[ClassificationResult]

@app.get("/")
async def root():
    return {"message": "Drone Sound Detection API"}

@app.post("/process-audio", response_model=ProcessResponse)
async def process_audio(file: UploadFile = File(...)):
    try:
        # Read uploaded file
        contents = await file.read()
        
        # Process audio file using librosa
        audio_data, sr = librosa.load(io.BytesIO(contents), sr=None)
        
        # Convert to list for JSON serialization
        waveform_data = audio_data[:10000].tolist() if len(audio_data) > 10000 else audio_data.tolist()
        
        # Load model
        processor, model, device, load_err = ensure_model()
        if load_err:
            raise HTTPException(status_code=500, detail=f"Model load failed: {load_err}")
        
        # Get predictions
        preds = predict_with_local_model(processor, model, device, audio_data, sr)
        if not preds:
            raise HTTPException(status_code=400, detail="No predictions (file too short?)")
        
        # Get top prediction
        top = max(preds, key=lambda x: x["score"])
        classification = f"Prediction: {top['label']} ({top['score']*100:.2f}%)"
        
        # Convert predictions to proper model
        all_predictions = [ClassificationResult(**pred) for pred in preds]
        
        return ProcessResponse(
            filename=file.filename,
            waveform_data=waveform_data,
            classification=classification,
            all_predictions=all_predictions
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)