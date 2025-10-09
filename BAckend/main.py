# backend/main.py
import os
import h5py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import numpy as np
from scipy.fft import fft, fftfreq
from scipy.signal import find_peaks
import librosa
import json
from typing import Optional, Dict, Any

app = FastAPI(title="Doppler Effect Simulator API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
SPEED_OF_SOUND = 343  # m/s
AUDIO_FILE = "CitroenC4Picasso_51.wav"
H5_FILE = "speed_estimations_NN_1000-200-50-10-1_reg1e-3_lossMSE.h5"

class SimulationParams(BaseModel):
    source_type: str
    observer_type: str
    source_x0: float
    source_y0: float
    observer_x0: float
    observer_y0: float
    source_speed: float
    source_dir: float
    observer_speed: float
    observer_dir: float
    f_emit: float
    time_elapsed: float

class H5StatsResponse(BaseModel):
    loaded: bool
    mode: Optional[float]
    mean: Optional[float]
    count: int
    used_key: Optional[str]
    error: Optional[str]

class AudioAnalysisResponse(BaseModel):
    dominant_freq: float
    spectrum_data: Dict[str, Any]
    audio_loaded: bool

class SimulationResponse(BaseModel):
    src_x: float
    src_y: float
    obs_x: float
    obs_y: float
    perceived_freq: float
    waves: list

def get_h5_stats():
    """Get HDF5 statistics"""
    vehiclename_full = os.path.splitext(os.path.basename(AUDIO_FILE))[0]
    vehiclename_prefix = vehiclename_full.split('_')[0] if '_' in vehiclename_full else vehiclename_full
    
    h5_loaded = False
    speed_mode = None
    speed_mean = None
    speed_count = 0
    speed_est_array = None
    h5_error_msg = None
    h5_used_key = None

    if os.path.exists(H5_FILE):
        try:
            with h5py.File(H5_FILE, 'r') as hf:
                available_keys = list(hf.keys())
                candidates = [k for k in available_keys if k.startswith(vehiclename_prefix)]
                pref1 = f"{vehiclename_prefix}_speeds_est_all"
                pref2 = f"{vehiclename_prefix}_speeds_gt"

                chosen_key = None
                if pref1 in hf:
                    chosen_key = pref1
                elif pref2 in hf:
                    chosen_key = pref2
                elif candidates:
                    chosen_key = candidates[0]

                if chosen_key:
                    h5_used_key = chosen_key
                    speed_est_array = np.array(hf[chosen_key])
                    speed_count = int(speed_est_array.size)

                    valid = speed_est_array[~np.isnan(speed_est_array)]
                    if valid.size > 0:
                        vals, counts = np.unique(valid, return_counts=True)
                        mode_val = vals[np.argmax(counts)]
                        mean_val = float(np.mean(valid))
                        speed_mode = float(mode_val)
                        speed_mean = mean_val
                        h5_loaded = True
                else:
                    h5_error_msg = f"No HDF5 keys starting with '{vehiclename_prefix}' found"
        except Exception as e:
            h5_error_msg = f"Error reading H5 file: {e}"
    else:
        h5_error_msg = f"H5 file '{H5_FILE}' not found"

    return H5StatsResponse(
        loaded=h5_loaded,
        mode=speed_mode,
        mean=speed_mean,
        count=speed_count,
        used_key=h5_used_key,
        error=h5_error_msg
    )

@app.get("/api/h5-stats", response_model=H5StatsResponse)
async def get_h5_statistics():
    """Get HDF5 file statistics"""
    return get_h5_stats()

@app.get("/api/audio-analysis", response_model=AudioAnalysisResponse)
async def analyze_audio():
    """Analyze audio file and return frequency data"""
    dominant_freq = 500
    audio_loaded = False
    spectrum_data = {}

    if os.path.exists(AUDIO_FILE):
        try:
            y, sr = librosa.load(AUDIO_FILE, sr=None, mono=True)
            N = len(y)
            yf = fft(y)
            xf = fftfreq(N, 1 / sr)[:N // 2]
            magnitude = 2.0 / N * np.abs(yf[0:N // 2])

            min_freq = 20
            min_idx = np.argmax(xf >= min_freq)
            peak_idx, _ = find_peaks(magnitude[min_idx:], height=np.max(magnitude) * 0.1, distance=100)

            if len(peak_idx) > 0:
                dominant_freq = float(xf[min_idx + peak_idx[0]])

            # Prepare spectrum data for frontend
            spectrum_data = {
                "xf": xf.tolist(),
                "magnitude": magnitude.tolist(),
                "dominant_freq": dominant_freq
            }
            audio_loaded = True
        except Exception as e:
            print(f"Error loading audio: {e}")
    else:
        print(f"Audio file '{AUDIO_FILE}' not found")

    return AudioAnalysisResponse(
        dominant_freq=dominant_freq,
        spectrum_data=spectrum_data,
        audio_loaded=audio_loaded
    )

@app.post("/api/simulation")
async def calculate_simulation(params: SimulationParams):
    """Calculate simulation state"""
    t = params.time_elapsed
    f_emit = params.f_emit
    
    # Calculate source position
    if params.source_type == 'moving':
        theta_s = np.radians(params.source_dir)
        src_x = params.source_x0 + params.source_speed * np.cos(theta_s) * t
        src_y = params.source_y0 + params.source_speed * np.sin(theta_s) * t
    else:
        src_x, src_y = params.source_x0, params.source_y0

    # Calculate observer position
    if params.observer_type == 'moving':
        theta_o = np.radians(params.observer_dir)
        obs_x = params.observer_x0 + params.observer_speed * np.cos(theta_o) * t
        obs_y = params.observer_y0 + params.observer_speed * np.sin(theta_o) * t
    else:
        obs_x, obs_y = params.observer_x0, params.observer_y0

    # Calculate distance and radial velocities
    dx = obs_x - src_x
    dy = obs_y - src_y
    distance = np.sqrt(dx**2 + dy**2)

    v_src_rad = 0.0
    v_obs_rad = 0.0

    if distance > 1e-6:
        ur_x = dx / distance
        ur_y = dy / distance

        if params.source_type == 'moving':
            v_sx = params.source_speed * np.cos(np.radians(params.source_dir))
            v_sy = params.source_speed * np.sin(np.radians(params.source_dir))
            v_src_rad = v_sx * ur_x + v_sy * ur_y

        if params.observer_type == 'moving':
            v_ox = params.observer_speed * np.cos(np.radians(params.observer_dir))
            v_oy = params.observer_speed * np.sin(np.radians(params.observer_dir))
            v_obs_rad = -(v_ox * ur_x + v_oy * ur_y)

    # Calculate perceived frequency
    denominator = SPEED_OF_SOUND - v_src_rad
    if abs(denominator) < 1e-6:
        f_perceived = f_emit
    else:
        f_perceived = f_emit * (SPEED_OF_SOUND + v_obs_rad) / denominator

    f_perceived = max(20, min(20000, f_perceived))
    f_perceived = round(f_perceived, 1)

    # Generate wave data
    waves = []
    wave_count = 6
    for n in range(wave_count):
        t_emit = max(0, t - n * (1.0 / max(1, f_emit)))
        radius = SPEED_OF_SOUND * (t - t_emit)
        if radius > 0:
            opacity = max(0.05, 1 - (n / wave_count) * 0.7)
            waves.append({
                "cx": float(src_x),
                "cy": float(src_y),
                "radius": float(radius),
                "opacity": opacity
            })

    return SimulationResponse(
        src_x=float(src_x),
        src_y=float(src_y),
        obs_x=float(obs_x),
        obs_y=float(obs_y),
        perceived_freq=f_perceived,
        waves=waves
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)