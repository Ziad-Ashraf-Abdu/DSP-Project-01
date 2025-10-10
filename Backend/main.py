from fastapi import FastAPI, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import numpy as np
import pandas as pd
import os
import json
import tempfile
from typing import List, Optional, Dict, Any
import asyncio
import base64
import io
from datetime import datetime
import logging

# Import your existing medical processing functions
from medical_processing import (
    load_patient_data, ConditionIdentificationModel, 
    analyze_ecg_image_with_teachable_machine, capture_graph_screenshot,
    process_patient_channels, get_display_channels, derive_third_ecg_channel,
    read_header_file, read_dat_file, read_edf_file, apply_signal_filtering,
    extract_ecg_features, extract_eeg_features, ensure_buffers_for_patient,
    AI_MODEL, PYEDFLIB_AVAILABLE, SCREENSHOT_AVAILABLE
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Medical ECG/EEG Analysis API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state (similar to your original GLOBAL_DATA)
class GlobalState:
    def __init__(self):
        self.patients = []
        self.dataset_type = "ECG"
        self.buffers = {}
        self.playback_state = {
            "playing": False,
            "positions": [],
            "write_indices": []
        }
        self.ai_model = AI_MODEL

global_state = GlobalState()

# Pydantic models for request/response
class LoadDataRequest(BaseModel):
    dataset_type: str
    data_dir: str

class PatientSelection(BaseModel):
    patient_ids: List[int]
    channels: Optional[List[str]] = None
    visualization_type: str = "icu"
    overlay_mode: str = "overlay"

class PlaybackControl(BaseModel):
    action: str  # play, pause, reset
    speed: float = 1.0
    chunk_ms: int = 200
    display_window: float = 8.0

class AnalysisRequest(BaseModel):
    patient_id: int
    analysis_type: str  # "1d" or "2d"
    signal_type: Optional[str] = None
    current_position: Optional[int] = None

class VisualizationUpdate(BaseModel):
    patient_id: int
    current_position: int
    visualization_type: str
    channels: List[str]
    overlay: bool = True

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Medical ECG/EEG Analysis API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "patients_loaded": len(global_state.patients),
        "dataset_type": global_state.dataset_type
    }

@app.post("/api/load-data")
async def load_data(request: LoadDataRequest):
    try:
        logger.info(f"Loading data: {request.dataset_type} from {request.data_dir}")
        
        if request.dataset_type == "EEG" and not PYEDFLIB_AVAILABLE:
            raise HTTPException(status_code=400, detail="pyedflib not installed. EEG support disabled.")

        data_dir = request.data_dir.strip()
        if not data_dir:
            # Auto-detect directory
            from medical_processing import find_dataset_directory
            data_dir = find_dataset_directory(request.dataset_type, ".")
            if not data_dir:
                raise HTTPException(status_code=400, detail=f"No {request.dataset_type} data found automatically.")

        if not os.path.isdir(data_dir):
            raise HTTPException(status_code=400, detail=f"Directory not found: {data_dir}")

        # Load patient data
        patients = load_patient_data(
            data_dir, 
            request.dataset_type,
            max_samples=None,
            max_patients=150 if request.dataset_type == "EEG" else None
        )
        
        if not patients:
            raise HTTPException(status_code=400, detail=f"No {request.dataset_type} patients found in {data_dir}")

        # Update global state
        global_state.patients = patients
        global_state.dataset_type = request.dataset_type
        global_state.buffers = {}
        global_state.playback_state = {
            "playing": False,
            "positions": [0] * len(patients),
            "write_indices": [0] * len(patients)
        }

        # Initialize buffers
        for idx, patient in enumerate(patients):
            fs = float(patient.get("header", {}).get("sampling_frequency", 250.0))
            ensure_buffers_for_patient(idx, fs, 8.0, global_state.buffers)

        # Prepare response
        patient_options = []
        for idx, patient in enumerate(patients):
            available_channels = [col for col in patient.get("ecg", pd.DataFrame()).columns 
                                if col.startswith("signal_")]
            patient_options.append({
                "id": idx,
                "name": patient.get("name", f"Patient {idx}"),
                "type": patient.get("type", request.dataset_type),
                "channels": available_channels,
                "total_samples": len(patient.get("ecg", [])),
                "total_channels": len(available_channels)
            })
        
        logger.info(f"Successfully loaded {len(patients)} patients")
        
        return {
            "success": True,
            "message": f"Loaded {len(patients)} {request.dataset_type} patients from {data_dir}",
            "patients": patient_options,
            "dataset_type": request.dataset_type
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load data: {str(e)}")

@app.get("/api/patients")
async def get_patients():
    """Get all loaded patients"""
    patient_options = []
    for idx, patient in enumerate(global_state.patients):
        available_channels = [col for col in patient.get("ecg", pd.DataFrame()).columns 
                            if col.startswith("signal_")]
        patient_options.append({
            "id": idx,
            "name": patient.get("name", f"Patient {idx}"),
            "type": patient.get("type", global_state.dataset_type),
            "channels": available_channels,
            "total_samples": len(patient.get("ecg", [])),
            "total_channels": len(available_channels)
        })
    
    return {
        "patients": patient_options,
        "total_count": len(patient_options),
        "dataset_type": global_state.dataset_type
    }

@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: int):
    """Get specific patient details"""
    if patient_id >= len(global_state.patients) or patient_id < 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient = global_state.patients[patient_id]
    available_channels = [col for col in patient.get("ecg", pd.DataFrame()).columns 
                         if col.startswith("signal_")]
    
    # Process channels for display
    processed_channels = process_patient_channels(
        patient, 
        global_state.dataset_type
    )
    
    return {
        "patient_id": patient_id,
        "name": patient.get("name", f"Patient {patient_id}"),
        "type": patient.get("type", global_state.dataset_type),
        "channels": available_channels,
        "processed_channels": processed_channels,
        "header_info": patient.get("header", {}),
        "total_samples": len(patient.get("ecg", [])),
        "current_position": global_state.playback_state["positions"][patient_id] if patient_id < len(global_state.playback_state["positions"]) else 0
    }

@app.get("/api/patients/{patient_id}/data")
async def get_patient_data(patient_id: int, start: int = 0, end: Optional[int] = None):
    """Get patient data for visualization"""
    if patient_id >= len(global_state.patients) or patient_id < 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient = global_state.patients[patient_id]
    ecg_data = patient.get("ecg")
    
    if ecg_data is None or len(ecg_data) == 0:
        raise HTTPException(status_code=404, detail="No data available for patient")
    
    if end is None:
        end = len(ecg_data)
    
    # Get data slice
    data_slice = ecg_data.iloc[start:end].copy()
    
    # Convert to JSON-serializable format
    result = {
        "patient_id": patient_id,
        "start_index": start,
        "end_index": end,
        "total_samples": len(ecg_data),
        "data": json.loads(data_slice.to_json(orient='records', date_format='iso'))
    }
    
    return result

@app.post("/api/visualization/data")
async def get_visualization_data(selection: PatientSelection):
    try:
        if not selection.patient_ids:
            return {"error": "No patients selected"}
        
        if not global_state.patients:
            raise HTTPException(status_code=400, detail="No patients loaded")
        
        visualization_data = []
        
        for pid in selection.patient_ids:
            if pid < len(global_state.patients):
                patient = global_state.patients[pid]
                current_pos = global_state.playback_state["positions"][pid] if pid < len(global_state.playback_state["positions"]) else 0
                
                # Prepare visualization data based on type
                viz_data = prepare_visualization_data(
                    patient, 
                    pid,
                    selection.visualization_type,
                    selection.channels,
                    selection.overlay_mode == "overlay",
                    current_pos
                )
                visualization_data.append(viz_data)
        
        return {
            "success": True,
            "visualization_type": selection.visualization_type,
            "data": visualization_data,
            "timestamp": datetime.now().isoformat(),
            "playback_state": global_state.playback_state
        }
    except Exception as e:
        logger.error(f"Error getting visualization data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/playback/control")
async def playback_control(control: PlaybackControl):
    try:
        if control.action == "play":
            global_state.playback_state["playing"] = True
        elif control.action == "pause":
            global_state.playback_state["playing"] = False
        elif control.action == "reset":
            global_state.playback_state["playing"] = False
            global_state.playback_state["positions"] = [0] * len(global_state.patients)
            global_state.playback_state["write_indices"] = [0] * len(global_state.patients)
            # Reset buffers
            for pid in global_state.buffers:
                buf = global_state.buffers[pid]
                buf["signal_buffer"].fill(np.nan)
                buf["write_idx"] = 0
                buf["rr_buffer"].fill(np.nan)
                buf["rr_write_idx"] = 0
                buf["last_peak_global_index"] = -1
                buf["direction"] = 1
                buf["ping_position"] = 0.0

        # Update playback parameters
        global_state.playback_state["speed"] = control.speed
        global_state.playback_state["chunk_ms"] = control.chunk_ms
        global_state.playback_state["display_window"] = control.display_window

        # Broadcast update to WebSocket clients
        await manager.broadcast(json.dumps({
            "type": "playback_state",
            "data": global_state.playback_state
        }))

        return {
            "action": control.action,
            "success": True,
            "playback_state": global_state.playback_state,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Playback control error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/playback/update")
async def playback_update():
    """Update playback positions - called periodically when playing"""
    try:
        if not global_state.playback_state["playing"]:
            return {"success": False, "message": "Playback not active"}
        
        chunk_ms_val = global_state.playback_state["chunk_ms"]
        speed_val = global_state.playback_state["speed"]
        display_window_val = global_state.playback_state["display_window"]
        
        updated_positions = []
        
        for pid, patient in enumerate(global_state.patients):
            if not patient or "ecg" not in patient or patient["ecg"] is None:
                updated_positions.append(global_state.playback_state["positions"][pid])
                continue

            ecg_data = patient["ecg"]
            if len(ecg_data) == 0:
                updated_positions.append(global_state.playback_state["positions"][pid])
                continue

            fs = float(patient.get("header", {}).get("sampling_frequency", 250.0))
            chunk_sec = (chunk_ms_val / 1000.0) * speed_val
            chunk_samples = max(1, int(round(chunk_sec * fs)))

            pos0 = global_state.playback_state["positions"][pid]
            pos1 = min(len(ecg_data), pos0 + chunk_samples)

            if pos1 > pos0:
                # Update buffer
                if "signal_1" in ecg_data.columns:
                    block = ecg_data["signal_1"].values[pos0:pos1]
                    if pid in global_state.buffers:
                        buf = global_state.buffers[pid]
                        N = buf["len"]
                        L = block.size
                        w0 = buf["write_idx"]

                        if L > 0:
                            if L >= N:
                                buf["signal_buffer"][:] = block[-N:]
                                write_idx = 0
                            else:
                                first_len = min(L, N - w0)
                                if first_len > 0:
                                    buf["signal_buffer"][w0:w0 + first_len] = block[:first_len]
                                rem = L - first_len
                                if rem > 0:
                                    buf["signal_buffer"][:rem] = block[first_len:]
                                write_idx = (w0 + L) % N

                            buf["write_idx"] = int(write_idx)
                            global_state.playback_state["write_indices"][pid] = int(write_idx)

            updated_positions.append(pos1)

        global_state.playback_state["positions"] = updated_positions

        # Check if all patients have reached the end
        all_finished = all(
            global_state.playback_state["positions"][i] >= len(global_state.patients[i]["ecg"]) 
            for i in range(len(global_state.patients))
        )
        
        if all_finished:
            global_state.playback_state["playing"] = False

        # Broadcast update
        await manager.broadcast(json.dumps({
            "type": "playback_update",
            "data": {
                "positions": global_state.playback_state["positions"],
                "playing": global_state.playback_state["playing"]
            }
        }))

        return {
            "success": True,
            "positions": global_state.playback_state["positions"],
            "playing": global_state.playback_state["playing"],
            "all_finished": all_finished
        }
    except Exception as e:
        logger.error(f"Playback update error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze")
async def ai_analysis(request: AnalysisRequest):
    try:
        if request.patient_id >= len(global_state.patients) or request.patient_id < 0:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient = global_state.patients[request.patient_id]
        signal_type = request.signal_type or global_state.dataset_type
        
        # Switch AI model to appropriate type
        model_switched = global_state.ai_model.switch_signal_type(signal_type)
        if not model_switched:
            raise HTTPException(status_code=400, detail=f"Failed to load {signal_type} model")
        
        if request.analysis_type == "1d":
            # 1D signal analysis
            current_position = request.current_position or len(patient["ecg"])
            signal_data = patient["ecg"].iloc[:current_position].copy()
            
            if len(signal_data) < 500:  # Minimum samples required
                raise HTTPException(status_code=400, detail=f"Insufficient data for analysis. Need at least 500 samples, got {len(signal_data)}")
            
            result = global_state.ai_model.analyze_patient_data(
                signal_data,
                signal_type=signal_type
            )
            
            analysis_result = {
                "analysis_type": "1d",
                "patient_id": request.patient_id,
                "signal_type": signal_type,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
            
        else:
            # 2D image analysis
            if not SCREENSHOT_AVAILABLE:
                raise HTTPException(status_code=400, detail="Screenshot capability not available. Install kaleido: pip install kaleido")
            
            current_position = request.current_position or len(patient["ecg"])
            if current_position <= 0:
                raise HTTPException(status_code=400, detail="No signal data available for 2D analysis")
            
            # Create visualization for screenshot
            fig = create_analysis_figure(patient, current_position)
            img_bytes = capture_graph_screenshot(fig)
            
            if img_bytes is None:
                raise HTTPException(status_code=500, detail="Failed to capture graph image")
            
            result = analyze_ecg_image_with_teachable_machine(img_bytes)
            
            analysis_result = {
                "analysis_type": "2d",
                "patient_id": request.patient_id,
                "signal_type": signal_type,
                "result": result,
                "timestamp": datetime.now().isoformat()
            }
        
        return analysis_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@app.get("/api/ai/model-info")
async def get_ai_model_info():
    try:
        model_info = global_state.ai_model.get_model_info()
        return {
            "model_info": model_info,
            "is_ready": global_state.ai_model.is_ready(),
            "current_signal_type": global_state.dataset_type
        }
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/switch-model")
async def switch_ai_model(signal_type: str):
    try:
        if signal_type not in ["ECG", "EEG"]:
            raise HTTPException(status_code=400, detail="Signal type must be 'ECG' or 'EEG'")
        
        success = global_state.ai_model.switch_signal_type(signal_type)
        return {
            "success": success,
            "current_signal_type": signal_type,
            "message": f"Switched to {signal_type} model" if success else f"Failed to switch to {signal_type} model"
        }
    except Exception as e:
        logger.error(f"Error switching model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/info")
async def get_system_info():
    """Get system information and capabilities"""
    return {
        "pyedflib_available": PYEDFLIB_AVAILABLE,
        "screenshot_available": SCREENSHOT_AVAILABLE,
        "patients_loaded": len(global_state.patients),
        "dataset_type": global_state.dataset_type,
        "ai_model_ready": global_state.ai_model.is_ready(),
        "timestamp": datetime.now().isoformat()
    }

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if needed
            await websocket.send_text(json.dumps({"type": "pong", "data": "connected"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Helper functions
def prepare_visualization_data(patient, patient_id, viz_type, channels, overlay, current_position):
    """Prepare data for visualization using the medical processing functions"""
    try:
        from medical_processing import make_viz_figure
        
        result = make_viz_figure(
            viz_type,
            patient,
            patient_id,
            channels,
            overlay,
            current_position,
            display_window_val=8.0,  # You can make this configurable
            global_buffers=global_state.buffers
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error preparing visualization data: {str(e)}")
        return {"error": f"Failed to prepare visualization: {str(e)}"}
    
def prepare_icu_data(ecg_data, channels, start, end, overlay, fs):
    """Prepare ICU monitor data"""
    traces = []
    
    for channel in channels:
        if channel not in ecg_data.columns:
            continue
            
        seg = ecg_data.iloc[start:end][["time", channel]]
        if len(seg) == 0:
            continue
            
        t = (seg["time"].values - seg["time"].values[0]).astype(float)
        y = seg[channel].values.astype(float)
        
        trace = {
            "x": t.tolist(),
            "y": y.tolist(),
            "type": "scatter",
            "mode": "lines",
            "name": channel,
            "line": {"width": 2}
        }
        traces.append(trace)
    
    layout = {
        "title": f"ICU Monitor",
        "xaxis": {"title": "Time (s)"},
        "yaxis": {"title": "Amplitude (mV)" if global_state.dataset_type == "ECG" else "Amplitude (µV)"},
        "template": "plotly_dark",
        "showlegend": overlay and len(traces) > 1
    }
    
    return {"traces": traces, "layout": layout}

def prepare_pingpong_data(patient_id, ecg_data, channels, start, end, overlay, fs, win):
    """Prepare ping-pong visualization data"""
    # This would implement the XOR overlay logic from your original code
    # Simplified for brevity - you would port your exact logic here
    return prepare_icu_data(ecg_data, channels, start, end, overlay, fs)

def prepare_polar_data(ecg_data, channels, current_position, overlay):
    """Prepare polar visualization data"""
    # Implementation for polar plot data
    current_data = ecg_data.iloc[:current_position]
    if len(current_data) == 0:
        return {"error": "No data available for polar plot"}
    
    # Simplified implementation - port your exact polar logic here
    return {"type": "polar", "data": "Polar data preparation"}

def prepare_crossrec_data(ecg_data, channels, current_position):
    """Prepare cross-recurrence visualization data"""
    if len(channels) < 2:
        return {"error": "Need at least 2 channels for cross-recurrence"}
    
    # Simplified implementation - port your exact crossrec logic here
    return {"type": "crossrec", "data": "Cross-recurrence data preparation"}

def create_analysis_figure(patient, current_position):
    """Create figure for 2D analysis"""
    try:
        import plotly.graph_objs as go
        
        ecg_data = patient["ecg"]
        display_window = global_state.playback_state.get("display_window", 8.0)
        fs = float(patient.get("header", {}).get("sampling_frequency", 250.0))
        win = int(display_window * fs)
        start = max(0, current_position - win)
        
        available_channels = [col for col in ecg_data.columns if col.startswith("signal_")]
        channels_to_plot = available_channels[:min(3, len(available_channels))]
        
        fig = go.Figure()
        
        for ch in channels_to_plot:
            seg = ecg_data.iloc[start:current_position][["time", ch]]
            if seg.shape[0] == 0:
                continue
            t = (seg["time"].values - seg["time"].values[0]).astype(float)
            y = seg[ch].values.astype(float)
            fig.add_trace(go.Scattergl(x=t, y=y, mode="lines", name=ch, line=dict(width=2)))
        
        fig.update_layout(
            template="plotly_dark",
            title=f"ECG Signal - {patient.get('name', 'Patient')}",
            xaxis=dict(title="Time (s)", showgrid=True, gridcolor='#444'),
            yaxis=dict(title="Amplitude (mV)", showgrid=True, gridcolor='#444'),
            height=600,
            width=800,
            showlegend=True
        )
        
        return fig
        
    except Exception as e:
        logger.error(f"Error creating analysis figure: {str(e)}")
        raise

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8052,
        reload=True,
        log_level="info"
    )