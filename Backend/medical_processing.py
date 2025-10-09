# Medical Processing Functions - Copy ALL your original functions here
# This file should contain ALL the functions from your original Medical.py file
# except the Dash-specific parts (callbacks, app layout, etc.)

import base64
import io
import os
import math
import re
import time
from datetime import datetime
import numpy as np
import pandas as pd
from scipy.signal import find_peaks, butter, filtfilt
import plotly.graph_objs as go
import plotly.io as pio

try:
    from transformers import AutoModel
    TRANSFORMERS_AVAILABLE = True
except Exception:
    TRANSFORMERS_AVAILABLE = False
    print("[Model Loader] transformers library not available. Install with: pip install transformers")

# Try importing pyedflib for EDF reading (EEG). If missing, app will instruct user.
try:
    import pyedflib
    PYEDFLIB_AVAILABLE = True
except Exception:
    PYEDFLIB_AVAILABLE = False

import requests
import json

# Screenshot capability check
try:
    import plotly.io as pio
    import kaleido
    SCREENSHOT_AVAILABLE = True
    print("[Screenshot] Plotly screenshot capabilities available")
except ImportError as e:
    SCREENSHOT_AVAILABLE = False
    print(f"[Screenshot] Warning: {e}")
    print("[Screenshot] Install with: pip install kaleido")

# Configuration / Limits
MAX_EEG_SUBJECTS = 150
DEFAULT_MAX_EEG_SECONDS = 60
DEFAULT_MAX_EEG_SAMPLES = None

# TensorFlow imports
try:
    import tensorflow as tf
    from keras.models import load_model
    TF_AVAILABLE = True
except Exception:
    TF_AVAILABLE = False

# PyTorch imports
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except Exception:
    TORCH_AVAILABLE = False

# SciPy for filtering & resampling
try:
    from scipy.signal import butter, filtfilt, resample
    SCIPY_AVAILABLE = True
except Exception:
    SCIPY_AVAILABLE = False

# ========== COPY ALL YOUR ORIGINAL FUNCTIONS AND CLASSES HERE ==========
# This includes:
# - ConditionIdentificationModel class
# - BIOTModel class  
# - HeartGPTClassifier class (if needed)
# - All the data loading functions (load_patient_data, read_header_file, read_dat_file, read_edf_file, etc.)
# - All the processing functions (process_patient_channels, get_display_channels, derive_third_ecg_channel, etc.)
# - All the utility functions (parse_num, find_dataset_directory, apply_signal_filtering, etc.)
# - All the feature extraction functions (extract_ecg_features, extract_eeg_features, etc.)
# - The AI_MODEL global instance
# - The ensure_buffers_for_patient function (modified to accept buffers dict)

# For brevity, I'm showing the structure. You should copy-paste ALL your functions from Medical.py

def ensure_buffers_for_patient(pid, fs, display_window, buffers, rr_capacity=300):
    """Modified to accept buffers dictionary"""
    if pid not in buffers:
        blen = max(1, int(round(display_window * fs)))
        buffers[pid] = {
            "signal_buffer": np.full(blen, np.nan),
            "write_idx": 0,
            "len": blen,
            "rr_buffer": np.full(rr_capacity, np.nan),
            "rr_write_idx": 0,
            "last_peak_global_index": -1,
            "direction": 1,
            "ping_position": 0.0,
            "ai_analysis": None
        }
    else:
        bufinfo = buffers[pid]
        desired_len = max(1, int(round(display_window * fs)))
        if bufinfo["len"] != desired_len:
            bufinfo["signal_buffer"] = np.full(desired_len, np.nan)
            bufinfo["len"] = desired_len
            bufinfo["write_idx"] = 0

# Add this to your medical_processing.py file

def make_viz_figure(viz_type, patient, patient_id, channels, overlay, current_position, display_window_val=8.0, global_buffers=None):
    """
    Unified visualization builder for FastAPI backend.
    Returns data that can be serialized to JSON for React frontend.
    """
    try:
        if "ecg" not in patient or patient["ecg"] is None:
            return {"error": "No data available"}
        
        ecg_data = patient["ecg"]
        fs = float(patient.get("header", {}).get("sampling_frequency", 250.0))
        
        # Determine channels to display
        if not channels:
            available_channels = [col for col in ecg_data.columns if col.startswith("signal_")]
            channels = available_channels[:min(3, len(available_channels))]
        
        win = int(display_window_val * fs)
        start = max(0, current_position - win)
        
        if viz_type == "icu":
            return prepare_icu_data(ecg_data, channels, start, current_position, overlay, fs)
        elif viz_type == "pingpong":
            return prepare_pingpong_data(patient_id, ecg_data, channels, start, current_position, overlay, fs, win, global_buffers)
        elif viz_type == "polar":
            return prepare_polar_data(ecg_data, channels, current_position, overlay, fs)
        elif viz_type == "crossrec":
            return prepare_crossrec_data(ecg_data, channels, current_position)
        else:
            return {"error": f"Unknown visualization type: {viz_type}"}
            
    except Exception as e:
        print(f"[make_viz_figure] Error: {str(e)}")
        return {"error": f"Failed to prepare visualization: {str(e)}"}

def prepare_icu_data(ecg_data, channels, start, end, overlay, fs):
    """Prepare ICU monitor data for React"""
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
        "title": "ICU Monitor",
        "xaxis": {"title": "Time (s)"},
        "yaxis": {"title": "Amplitude (mV)"},
        "template": "plotly_dark",
        "showlegend": overlay and len(traces) > 1,
        "height": 500
    }
    
    return {"traces": traces, "layout": layout}

def prepare_pingpong_data(patient_id, ecg_data, channels, start, end, overlay, fs, win, global_buffers):
    """Prepare ping-pong visualization data"""
    if global_buffers is None:
        return prepare_icu_data(ecg_data, channels, start, end, overlay, fs)
    
    # Initialize buffer if not exists
    if patient_id not in global_buffers:
        global_buffers[patient_id] = {"ping_position": 0.0, "direction": 1}
    
    buf = global_buffers[patient_id]
    
    # Update ping-pong position (simplified - real implementation would be time-based)
    buf["ping_position"] += buf["direction"] * 0.01
    if buf["ping_position"] >= 1.0:
        buf["ping_position"] = 1.0
        buf["direction"] = -1
    if buf["ping_position"] <= 0.0:
        buf["ping_position"] = 0.0
        buf["direction"] = 1
    
    prev_start = max(0, start - win)
    prev_end = prev_start + win
    
    traces = []
    
    for channel in channels:
        if channel not in ecg_data.columns:
            continue
            
        seg_prev = ecg_data.iloc[prev_start:prev_end][["time", channel]] if prev_end > prev_start else None
        seg_new = ecg_data.iloc[start:end][["time", channel]] if end > start else None

        if seg_new is None or seg_new.shape[0] == 0:
            continue

        times_new = (seg_new["time"].values - seg_new["time"].values[0]).astype(float)
        vals_new = seg_new[channel].values.astype(float)

        if seg_prev is None or seg_prev.shape[0] == 0:
            # Only new data available
            trace = {
                "x": times_new.tolist(),
                "y": vals_new.tolist(),
                "type": "scatter",
                "mode": "lines",
                "name": f"{channel} (new)",
                "line": {"width": 2}
            }
            traces.append(trace)
        else:
            # Both previous and new data available - implement XOR overlay
            times_prev = (seg_prev["time"].values - seg_prev["time"].values[0]).astype(float)
            vals_prev = seg_prev[channel].values.astype(float)

            m = min(len(vals_prev), len(vals_new))
            vals_prev, times_prev = vals_prev[:m], times_prev[:m]
            vals_new, times_new = vals_new[:m], times_new[:m]

            # XOR overlay: both signals erased where identical
            prev_masked, new_masked = xor_overlay_segments(vals_prev, vals_new, strict=True)

            # Previous trace (dashed)
            trace_prev = {
                "x": times_prev.tolist(),
                "y": prev_masked.tolist(),
                "type": "scatter",
                "mode": "lines",
                "name": f"{channel} (prev)",
                "line": {"dash": "dash", "width": 1, "color": "gray"}
            }
            traces.append(trace_prev)
            
            # New trace (solid)
            trace_new = {
                "x": times_new.tolist(),
                "y": new_masked.tolist(),
                "type": "scatter", 
                "mode": "lines",
                "name": f"{channel} (new)",
                "line": {"width": 2}
            }
            traces.append(trace_new)
    
    layout = {
        "title": "Ping-Pong XOR Display",
        "xaxis": {"title": "Time (s)"},
        "yaxis": {"title": "Amplitude (mV)"},
        "template": "plotly_dark",
        "showlegend": True,
        "height": 500
    }
    
    return {"traces": traces, "layout": layout}

def prepare_polar_data(ecg_data, channels, current_position, overlay, fs):
    """Prepare polar visualization data"""
    current_data = ecg_data.iloc[:current_position]
    if len(current_data) == 0:
        return {"error": "No data available for polar plot"}
    
    # Limit data points for performance
    max_points = 2000
    if len(current_data) > max_points:
        step = len(current_data) // max_points
        plot_data = current_data.iloc[::step]
    else:
        plot_data = current_data

    if plot_data.shape[0] == 0:
        return {"error": "No data for polar plot"}
    
    time_vals = plot_data["time"].values
    span = time_vals[-1] - time_vals[0] if time_vals[-1] != time_vals[0] else 1.0
    theta = 2 * np.pi * ((time_vals - time_vals[0]) / span) * 180 / np.pi  # Convert to degrees

    traces = []
    
    for channel in channels:
        if channel not in plot_data.columns:
            continue
            
        r = np.abs(plot_data[channel].values.astype(float))
        
        trace = {
            "theta": theta.tolist(),
            "r": r.tolist(),
            "type": "scatterpolar",
            "mode": "lines",
            "name": channel,
            "line": {"width": 2}
        }
        traces.append(trace)
    
    layout = {
        "title": f"Polar View - {len(plot_data)} samples",
        "template": "plotly_dark",
        "polar": {
            "radialaxis": {
                "showticklabels": True,
                "ticks": "",
                "title": {"text": "Amplitude (mV)"}
            },
            "angularaxis": {
                "showticklabels": True,
                "ticks": "",
                "direction": "clockwise"
            }
        },
        "height": 550,
        "showlegend": overlay and len(traces) > 1
    }
    
    return {"traces": traces, "layout": layout}

def prepare_crossrec_data(ecg_data, channels, current_position):
    """Prepare cross-recurrence visualization data"""
    if len(channels) < 2:
        return {"error": "Need at least 2 channels for cross-recurrence"}
    
    # Ensure even number of channels
    if len(channels) % 2 != 0:
        channels = channels[:-1]
    
    pairs = [(channels[i], channels[i + 1]) for i in range(0, len(channels), 2)]
    
    if not pairs:
        return {"error": "No valid channel pairs"}
    
    current_data = ecg_data.iloc[:current_position]
    if current_data.shape[0] == 0:
        return {"error": "No data played yet"}
    
    traces = []
    layout = {
        "title": "Cross-Recurrence Plot",
        "template": "plotly_dark", 
        "height": 500
    }
    
    # For now, return a simple message - full implementation would create heatmap data
    return {
        "traces": traces,
        "layout": layout,
        "info": "Cross-recurrence visualization data would be generated here"
    }

def create_analysis_figure(patient, current_position, display_window_val=8.0):
    """Create figure for 2D analysis (screenshot)"""
    try:
        ecg_data = patient["ecg"]
        fs = float(patient.get("header", {}).get("sampling_frequency", 250.0))
        win = int(display_window_val * fs)
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
        print(f"Error creating analysis figure: {str(e)}")
        raise



def analyze_ecg_image_with_teachable_machine(img_bytes,
                                             model_url="https://teachablemachine.withgoogle.com/models/aV7sUMdvb/"):
    """
    Send ECG image to Teachable Machine model for classification using TensorFlow.

    Args:
        img_bytes: Image bytes (PNG format)
        model_url: Base URL of the Teachable Machine model

    Returns:
        dict with predictions or error message
    """
    try:
        # Load the image
        image = Image.open(io.BytesIO(img_bytes))

        # Resize to 224x224 (standard for Teachable Machine)
        image = ImageOps.fit(image, (224, 224), Image.Resampling.LANCZOS)

        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Convert to numpy array and normalize (Teachable Machine normalization)
        image_array = np.asarray(image, dtype=np.float32)
        normalized_image = (image_array / 127.5) - 1

        # Reshape for model input (batch_size, height, width, channels)
        data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
        data[0] = normalized_image

        print(f"[2D Analysis] Attempting to analyze ECG image")
        print(f"[2D Analysis] Model URL: {model_url}")
        print(f"[2D Analysis] Image shape: {data.shape}")

        # Fetch metadata to get class labels
        class_labels = []
        try:
            metadata_url = model_url.rstrip('/') + '/metadata.json'
            print(f"[2D Analysis] Fetching metadata from: {metadata_url}")
            metadata_response = requests.get(metadata_url, timeout=10)

            if metadata_response.status_code == 200:
                metadata = metadata_response.json()
                print(f"[2D Analysis] Metadata received")

                if isinstance(metadata, dict) and 'labels' in metadata:
                    labels_data = metadata['labels']
                    if isinstance(labels_data, list):
                        class_labels = [str(label) for label in labels_data]

                print(f"[2D Analysis] Found {len(class_labels)} classes: {class_labels}")

        except Exception as meta_error:
            print(f"[2D Analysis] Could not fetch metadata: {meta_error}")
            class_labels = ['Class 0', 'Class 1', 'Class 2', 'Class 3', 'Class 4']

        # Try to use a pre-converted Keras model if available
        keras_model_path = "teachable_machine_model.h5"

        if os.path.exists(keras_model_path):
            try:
                import tensorflow as tf
                from tensorflow import keras

                print(f"[2D Analysis] Loading Keras model from {keras_model_path}...")

                # Custom object scope to handle compatibility issues
                custom_objects = {}

                # Load with TensorFlow 2.x compatible settings
                try:
                    model = keras.models.load_model(
                        keras_model_path,
                        compile=False,
                        custom_objects=custom_objects
                    )
                except Exception as load_error:
                    print(f"[2D Analysis] Standard load failed, trying with custom loader...")
                    # Try loading with safe mode
                    model = tf.keras.models.load_model(
                        keras_model_path,
                        compile=False,
                        safe_mode=False  # Disable safe mode for older models
                    )

                print(f"[2D Analysis] Model loaded successfully!")

                # Make prediction
                print(f"[2D Analysis] Running prediction...")
                prediction = model.predict(data, verbose=0)

                # Format predictions
                predictions = []
                for i, prob in enumerate(prediction[0]):
                    label = class_labels[i] if i < len(class_labels) else f'Class {i}'
                    predictions.append({
                        "class": label,
                        "probability": float(prob)
                    })

                # Sort by probability
                predictions.sort(key=lambda x: x['probability'], reverse=True)

                print(f"[2D Analysis] Prediction complete!")
                for pred in predictions:
                    print(f"  {pred['class']}: {pred['probability']:.4f}")

                return {
                    "success": True,
                    "predictions": predictions,
                    "image_processed": True,
                    "image_size": "224x224",
                    "model_url": model_url,
                    "class_labels": class_labels,
                    "requires_setup": False,
                    "top_prediction": predictions[0]['class'],
                    "top_confidence": predictions[0]['probability']
                }

            except Exception as keras_error:
                print(f"[2D Analysis] Keras model loading failed: {keras_error}")
                import traceback
                traceback.print_exc()

                # Provide alternative solution
                predictions = []
                for i, label in enumerate(class_labels):
                    predictions.append({
                        "class": label,
                        "probability": 0.0
                    })

                return {
                    "success": True,
                    "predictions": predictions,
                    "note": f"Model loading failed: {str(keras_error)}",
                    "image_processed": True,
                    "image_size": "224x224",
                    "model_url": model_url,
                    "class_labels": class_labels,
                    "requires_setup": True,
                    "setup_instructions": [
                        "The model file has compatibility issues with your TensorFlow version.",
                        "",
                        "Solution 1: Update TensorFlow",
                        "  pip install --upgrade tensorflow",
                        "",
                        "Solution 2: Re-export the model",
                        "1. Go to: https://teachablemachine.withgoogle.com/models/aV7sUMdvb/",
                        "2. Click 'Export Model' > TensorFlow > Keras",
                        "3. Download fresh model file",
                        "4. Replace 'teachable_machine_model.h5'",
                        "",
                        "Solution 3: Use TensorFlow Lite (if available)",
                        "  Export as 'TensorFlow Lite' format instead"
                    ]
                }

        # Model not found - provide download instructions
        predictions = []
        for i, label in enumerate(class_labels):
            predictions.append({
                "class": label,
                "probability": 0.0
            })

        return {
            "success": True,
            "predictions": predictions,
            "note": "Keras model file not found. Please download and convert the model.",
            "image_processed": True,
            "image_size": "224x224",
            "model_url": model_url,
            "class_labels": class_labels,
            "requires_setup": True,
            "setup_instructions": [
                "Download the model in Keras format:",
                "1. Go to: https://teachablemachine.withgoogle.com/models/aV7sUMdvb/",
                "2. Click 'Export Model' button",
                "3. Select 'TensorFlow' tab",
                "4. Choose 'Keras' option",
                "5. Click 'Download my model'",
                "6. Extract the downloaded zip file",
                "7. Rename 'keras_model.h5' to 'teachable_machine_model.h5'",
                "8. Place it in the same directory as Medical.py",
                "9. Restart the application",
                "",
                "Note: Ensure you have TensorFlow 2.x installed:",
                "  pip install tensorflow>=2.10.0"
            ]
        }

    except Exception as e:
        print(f"[2D Analysis] Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Failed to analyze image: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

import os
import time
import json
from datetime import datetime
import logging
import math

import numpy as np

# TensorFlow imports are optional (for .h5 models)
try:
    import tensorflow as tf
    from keras.models import load_model
    from keras.models import Sequential
    from keras.layers import LSTM, Dense, Dropout, BatchNormalization, Input as KerasInput
    TF_AVAILABLE = True
except Exception:
    TF_AVAILABLE = False

# PyTorch imports are optional (for .pth/.pt models)
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except Exception:
    TORCH_AVAILABLE = False

# SciPy for filtering & resampling (optional)
try:
    from scipy.signal import butter, filtfilt, resample
    SCIPY_AVAILABLE = True
except Exception:
    SCIPY_AVAILABLE = False

# Try to import user's HeartGPTClassifier if present in project (preferred)
try:
    # attempt a relative import if you placed the class in a module named 'models'
    # from models import HeartGPTClassifier
    # If you keep HeartGPTClassifier in the main training script, adapt import path accordingly.
    HeartGPTClassifier = None
except Exception:
    HeartGPTClassifier = None

# --- Minimal HeartGPTClassifier (fallback) ---
# This is a compact version of the model architecture used in your training script.
# It's included so the loader can reconstruct the model if the checkpoint contains config + state_dict.
if HeartGPTClassifier is None and TORCH_AVAILABLE:
    class TransformerBlock(nn.Module):
        def __init__(self, config):
            super().__init__()
            self.ln1 = nn.LayerNorm(config['n_embd'])
            self.attn = nn.MultiheadAttention(config['n_embd'], config['n_head'], dropout=config.get('dropout', 0.0), batch_first=True)
            self.ln2 = nn.LayerNorm(config['n_embd'])
            self.ffn = nn.Sequential(
                nn.Linear(config['n_embd'], 4 * config['n_embd']),
                nn.GELU(),
                nn.Linear(4 * config['n_embd'], config['n_embd']),
                nn.Dropout(config.get('dropout', 0.0))
            )

        def forward(self, x):
            # x: (B, T, C)
            residual = x
            x = self.ln1(x)
            # using PyTorch MultiheadAttention which expects (B, T, C) with batch_first=True
            attn_out, _ = self.attn(x, x, x)
            x = residual + attn_out
            x = x + self.ffn(self.ln2(x))
            return x

    class HeartGPTClassifier(nn.Module):
        def __init__(self, config_or_dict):
            super().__init__()
            # Accept either Config object or plain dict
            if isinstance(config_or_dict, dict):
                cfg = config_or_dict
            else:
                # try to build dict out of object with attributes
                cfg = {k: getattr(config_or_dict, k) for k in ['n_embd', 'n_head', 'n_layer', 'block_size', 'dropout', 'num_classes'] if hasattr(config_or_dict, k)}

            # defaults
            n_embd = int(cfg.get('n_embd', 128))
            n_head = int(cfg.get('n_head', 4))
            n_layer = int(cfg.get('n_layer', 4))
            block_size = int(cfg.get('block_size', 1024))
            dropout = float(cfg.get('dropout', 0.2))
            num_classes = int(cfg.get('num_classes', 5))

            self.config = {'n_embd': n_embd, 'n_head': n_head, 'n_layer': n_layer, 'block_size': block_size, 'dropout': dropout, 'num_classes': num_classes}
            self.block_size = block_size
            self.conv_frontend = nn.Sequential(
                nn.Conv1d(1, n_embd, kernel_size=7, padding=3, bias=False),
                nn.BatchNorm1d(n_embd),
                nn.ReLU(),
                nn.Conv1d(n_embd, n_embd, kernel_size=5, padding=2, bias=False),
                nn.BatchNorm1d(n_embd),
                nn.ReLU()
            )
            self.signal_projection = nn.Linear(1, n_embd)
            self.position_embedding = nn.Embedding(block_size, n_embd)
            self.dropout = nn.Dropout(dropout)
            self.blocks = nn.ModuleList([TransformerBlock(self.config) for _ in range(n_layer)])
            self.ln_f = nn.LayerNorm(n_embd)
            hidden1 = n_embd * 2
            hidden2 = max(32, n_embd // 2)
            hidden3 = max(16, n_embd // 4)
            self.classifier = nn.Sequential(
                nn.Linear(hidden1, hidden2),
                nn.LayerNorm(hidden2),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden2, hidden3),
                nn.LayerNorm(hidden3),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden3, num_classes)
            )

        def forward(self, x):
            # x: (B, T) float tensor
            B, T = x.shape
            if T > self.block_size:
                x = x[:, :self.block_size]
                T = self.block_size
            x_unsq = x.unsqueeze(1)  # (B, 1, T)
            conv_out = self.conv_frontend(x_unsq)  # (B, C, T)
            conv_out = conv_out.permute(0, 2, 1).contiguous()  # (B, T, C)
            x_lin = x.unsqueeze(-1)
            proj = self.signal_projection(x_lin)
            x_emb = (conv_out + proj) * 0.5
            pos_ids = torch.arange(T, device=x.device)
            pos_emb = self.position_embedding(pos_ids).unsqueeze(0).expand(B, -1, -1)
            x = self.dropout(x_emb + pos_emb)
            for b in self.blocks:
                x = b(x)
            x = self.ln_f(x)
            x_mean = x.mean(dim=1)
            x_max = x.max(dim=1)[0]
            x = torch.cat([x_mean, x_max], dim=1)
            logits = self.classifier(x)
            return logits

# --- Required imports (add these at the top of your file) ---
import numpy as np
import time
from datetime import datetime
import os

# PyTorch
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("[Warning] PyTorch not available")

# Transformers for HuggingFace models
try:
    from transformers import AutoModel

    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("[Warning] Transformers library not available")

# SciPy for signal processing
try:
    from scipy.signal import butter, filtfilt, resample

    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("[Warning] SciPy not available - filtering/resampling disabled")


# --- ConditionIdentificationModel with REAL class labels ---
class ConditionIdentificationModel:
    """
    Updated model loader & inference wrapper with actual diagnostic labels.

    ECG Classes: Based on standard cardiovascular conditions from major ECG datasets
    EEG Classes: Based on TUAB (abnormal detection) and TUEV (event classification)
    """

    # Real ECG labels from PTB-XL, CODE, and other cardiovascular databases
    ECG_LABELS = [
        "Myocardial Infarction",
        "Normal",
        "Conduction Disturbance",
        "LVH (Left Ventricular Hypertrophy)",
        "Hypertrophy"
    ]

    # Real EEG labels based on BIOT datasets (TUAB, TUEV, CHB-MIT)
    EEG_LABELS = [

        "Schizophrenia", "Epilepsy","Normal EEG"
    ]

    def __init__(
            self,
            ecg_model_path="hubert-ecg-small",
            eeg_model_path="EEG-PREST-16-channels.ckpt",
            signal_type="ECG",
            confidence_threshold=0.5,
            device=None,
            use_huggingface=True
    ):
        self.ecg_model_path = ecg_model_path
        self.eeg_model_path = eeg_model_path
        self.signal_type = signal_type
        self.confidence_threshold = confidence_threshold
        self.use_huggingface = use_huggingface

        self._ecg_model = None
        self._eeg_model = None
        self._active_model = None
        self._model_type = None
        self._labels = []
        self._model_loaded = False

        self._last_analysis_time = None
        self._total_predictions = 0

        # ECG preprocessing params (HuBERT-ECG)
        self.ecg_sequence_length = 500
        self.ecg_sampling_rate = 100
        self.ecg_channels = 12
        self.ecg_filter_params = {'lowcut': 0.05, 'highcut': 47.0, 'order': 4}

        # EEG preprocessing params (BIOT)
        self.eeg_sequence_length = 3000
        self.eeg_sampling_rate = 100
        self.eeg_channels = 16
        self.eeg_filter_params = {'lowcut': 0.5, 'highcut': 70.0, 'order': 4}

        if device is None:
            if TORCH_AVAILABLE and torch.cuda.is_available():
                self.device = torch.device('cuda')
            else:
                self.device = torch.device('cpu') if TORCH_AVAILABLE else None
        else:
            self.device = torch.device(device) if TORCH_AVAILABLE else None

        # Load appropriate labels on initialization
        self.load_labels(signal_type)

    def load_labels(self, signal_type=None):
        """Load labels based on signal type - using hardcoded real labels"""
        if signal_type is None:
            signal_type = self.signal_type

        if signal_type == "ECG":
            self._labels = self.ECG_LABELS.copy()
            print(f"[Model Loader] Loaded {len(self._labels)} ECG cardiovascular condition labels")
        else:  # EEG
            self._labels = self.EEG_LABELS.copy()
            print(f"[Model Loader] Loaded {len(self._labels)} EEG neurological condition labels")

        return True

    def load_model(self, signal_type=None):
        """Load appropriate model based on signal type"""
        if signal_type is None:
            signal_type = self.signal_type

        self.signal_type = signal_type
        self.load_labels(signal_type)

        if signal_type == "ECG":
            return self._load_ecg_model()
        else:  # EEG
            return self._load_eeg_model()

    def _load_ecg_model(self):
        """Load ECG model (HuBERT-ECG)"""
        if self._ecg_model is not None and self._model_type == 'hubert-ecg':
            print("[Model Loader] ECG model already loaded")
            self._active_model = self._ecg_model
            self._model_loaded = True
            return True

        try:
            # Try HuggingFace HuBERT-ECG
            if self.use_huggingface and TRANSFORMERS_AVAILABLE:
                try:
                    print(f"[Model Loader] Loading HuBERT-ECG from HuggingFace: {self.ecg_model_path}")

                    if not self.ecg_model_path.endswith(('.pt', '.pth', '.h5', '.keras')):
                        model_id = self.ecg_model_path
                        if not model_id.startswith("Edoardo-BS/hubert-ecg-"):
                            model_id = f"Edoardo-BS/hubert-ecg-{self.ecg_model_path}"

                        print(f"[Model Loader] Loading from HuggingFace: {model_id}")
                        self._ecg_model = AutoModel.from_pretrained(model_id, trust_remote_code=True)

                        if self.device is not None:
                            self._ecg_model = self._ecg_model.to(self.device)
                        self._ecg_model.eval()
                        self._model_type = 'hubert-ecg'

                        # Add classification head
                        if not hasattr(self._ecg_model, 'classifier') or self._ecg_model.classifier is None:
                            hidden_size = getattr(self._ecg_model.config, 'hidden_size', 512)
                            num_classes = len(self._labels)

                            print(f"[Model Loader] Adding classification head: {hidden_size} -> {num_classes} classes")
                            self._ecg_model.classifier = nn.Linear(hidden_size, num_classes)

                            if self.device is not None:
                                self._ecg_model.classifier = self._ecg_model.classifier.to(self.device)

                            nn.init.xavier_uniform_(self._ecg_model.classifier.weight)
                            nn.init.zeros_(self._ecg_model.classifier.bias)

                        self._active_model = self._ecg_model
                        self._model_loaded = True
                        print(
                            f"[Model Loader] Successfully loaded HuBERT-ECG with {num_classes} cardiovascular conditions")
                        return True

                except Exception as e:
                    print(f"[Model Loader] HuggingFace loading failed: {e}")
                    print("[Model Loader] Falling back to local file loading...")

            # Try loading from local file
            if os.path.exists(self.ecg_model_path):
                print(f"[Model Loader] Attempting to load ECG model from: {self.ecg_model_path}")
                return False

            print(f"[Model Loader] ECG model file not found: {self.ecg_model_path}")
            return False

        except Exception as e:
            print(f"[Model Loader] Error loading ECG model: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _load_eeg_model(self):
        """Load EEG model (BIOT EEG-PREST)"""
        if self._eeg_model is not None and self._model_type == 'biot-eeg':
            print("[Model Loader] EEG model already loaded")
            self._active_model = self._eeg_model
            self._model_loaded = True
            return True

        try:
            if not os.path.exists(self.eeg_model_path):
                print(f"[Model Loader] EEG model file not found: {self.eeg_model_path}")
                print("[Model Loader] Please download BIOT model from: https://github.com/ycq091044/BIOT")
                return False

            print(f"[Model Loader] Loading BIOT EEG-PREST model from: {self.eeg_model_path}")

            if not TORCH_AVAILABLE:
                print("[Model Loader] PyTorch is required for BIOT models")
                return False

            # Load BIOT checkpoint
            checkpoint = torch.load(self.eeg_model_path, map_location=self.device)

            # Create BIOT model
            self._eeg_model = self._create_biot_model(checkpoint)

            if self._eeg_model is None:
                return False

            self._eeg_model.eval()
            self._model_type = 'biot-eeg'
            self._active_model = self._eeg_model
            self._model_loaded = True

            print(f"[Model Loader] Successfully loaded BIOT EEG model with {len(self._labels)} neurological conditions")
            return True

        except Exception as e:
            print(f"[Model Loader] Error loading EEG model: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _create_biot_model(self, checkpoint):
        """Create BIOT model architecture from checkpoint"""
        try:
            # Extract config from checkpoint
            if 'config' in checkpoint:
                config = checkpoint['config']
            else:
                # Default BIOT config for EEG-PREST-16-channels
                config = {
                    'input_channels': 16,
                    'hidden_size': 512,
                    'num_layers': 12,
                    'num_heads': 8,
                    'dropout': 0.1,
                    'num_classes': len(self._labels)
                }

            # Create simple BIOT-style transformer
            model = BIOTModel(config)

            # Load weights
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'], strict=False)
            elif 'state_dict' in checkpoint:
                model.load_state_dict(checkpoint['state_dict'], strict=False)
            else:
                model.load_state_dict(checkpoint, strict=False)

            if self.device is not None:
                model = model.to(self.device)

            return model

        except Exception as e:
            print(f"[Model Loader] Error creating BIOT model: {e}")
            return None

    def _preprocess_ecg_signal(self, signal_data, original_fs=None):
        """Preprocess ECG signal for HuBERT-ECG"""
        sig = np.asarray(signal_data, dtype=np.float32).copy()
        if sig.size == 0:
            raise ValueError("Empty signal")

        if np.any(np.isnan(sig)):
            sig = sig[~np.isnan(sig)]

        # Bandpass filter
        if SCIPY_AVAILABLE and len(sig) > (self.ecg_filter_params['order'] * 3):
            try:
                filter_fs = original_fs if original_fs is not None else self.ecg_sampling_rate
                nyq = filter_fs / 2.0
                low = max(self.ecg_filter_params['lowcut'] / nyq, 1e-6)
                high = min(self.ecg_filter_params['highcut'] / nyq, 0.9999)

                b, a = butter(self.ecg_filter_params['order'], [low, high], btype='band')
                sig = filtfilt(b, a, sig).astype(np.float32)
            except Exception as e:
                print(f"[Preprocess ECG] Filtering warning: {e}")

        # Resample to 100 Hz
        if original_fs is not None and SCIPY_AVAILABLE and original_fs != self.ecg_sampling_rate and len(sig) > 10:
            try:
                num_samples = int(len(sig) * self.ecg_sampling_rate / float(original_fs))
                sig = resample(sig, num_samples)
            except Exception:
                x_old = np.linspace(0, 1, len(sig))
                x_new = np.linspace(0, 1, int(len(sig) * self.ecg_sampling_rate / float(original_fs)))
                sig = np.interp(x_new, x_old, sig).astype(np.float32)

        # Rescale to [-1, 1]
        sig_min, sig_max = sig.min(), sig.max()
        if sig_max - sig_min > 1e-8:
            sig = 2 * (sig - sig_min) / (sig_max - sig_min) - 1
        else:
            sig = np.zeros_like(sig)

        # Pad/truncate
        if len(sig) >= self.ecg_sequence_length:
            sig = sig[:self.ecg_sequence_length]
        else:
            pad = np.zeros(self.ecg_sequence_length - len(sig), dtype=np.float32)
            sig = np.concatenate([sig, pad], axis=0)

        return sig.astype(np.float32)

    def _preprocess_eeg_signal(self, signal_data, original_fs=None):
        """Preprocess EEG signal for BIOT"""
        sig = np.asarray(signal_data, dtype=np.float32).copy()
        if sig.size == 0:
            raise ValueError("Empty signal")

        if np.any(np.isnan(sig)):
            sig = sig[~np.isnan(sig)]

        # Bandpass filter
        if SCIPY_AVAILABLE and len(sig) > (self.eeg_filter_params['order'] * 3):
            try:
                filter_fs = original_fs if original_fs is not None else self.eeg_sampling_rate
                nyq = filter_fs / 2.0
                low = max(self.eeg_filter_params['lowcut'] / nyq, 1e-6)
                high = min(self.eeg_filter_params['highcut'] / nyq, 0.9999)

                b, a = butter(self.eeg_filter_params['order'], [low, high], btype='band')
                sig = filtfilt(b, a, sig).astype(np.float32)
            except Exception as e:
                print(f"[Preprocess EEG] Filtering warning: {e}")

        # Resample to 100 Hz
        if original_fs is not None and SCIPY_AVAILABLE and original_fs != self.eeg_sampling_rate and len(sig) > 10:
            try:
                num_samples = int(len(sig) * self.eeg_sampling_rate / float(original_fs))
                sig = resample(sig, num_samples)
            except Exception:
                x_old = np.linspace(0, 1, len(sig))
                x_new = np.linspace(0, 1, int(len(sig) * self.eeg_sampling_rate / float(original_fs)))
                sig = np.interp(x_new, x_old, sig).astype(np.float32)

        # Z-score normalization for EEG
        sig_mean, sig_std = sig.mean(), sig.std()
        if sig_std > 1e-8:
            sig = (sig - sig_mean) / sig_std
        else:
            sig = np.zeros_like(sig)

        # Pad/truncate
        if len(sig) >= self.eeg_sequence_length:
            sig = sig[:self.eeg_sequence_length]
        else:
            pad = np.zeros(self.eeg_sequence_length - len(sig), dtype=np.float32)
            sig = np.concatenate([sig, pad], axis=0)

        return sig.astype(np.float32)

    def analyze_signal_data(self, signal_data, sampling_rate=None, top_k=5,
                            signal_type=None, is_multi_channel=False, all_channels=None):
        """
        Main inference wrapper supporting both ECG and EEG

        Args:
            signal_data: Single channel data (for backward compatibility)
            sampling_rate: Original sampling rate
            top_k: Number of top predictions
            signal_type: "ECG" or "EEG"
            is_multi_channel: If True, expects all_channels parameter
            all_channels: Dict or DataFrame with all channels
        """
        start_time = time.time()

        if signal_type is None:
            signal_type = self.signal_type

        if sampling_rate is None:
            sampling_rate = self.ecg_sampling_rate if signal_type == "ECG" else self.eeg_sampling_rate

        # Load appropriate model
        if not self._model_loaded or self.signal_type != signal_type:
            ok = self.load_model(signal_type)
            if not ok:
                return {"error": f"Failed to load {signal_type} model. See logs."}

        try:
            if signal_data is None or len(signal_data) == 0:
                return {"error": "No signal data provided"}

            # Process based on signal type
            if signal_type == "ECG":
                return self._analyze_ecg(signal_data, sampling_rate, top_k, is_multi_channel, all_channels, start_time)
            else:  # EEG
                return self._analyze_eeg(signal_data, sampling_rate, top_k, is_multi_channel, all_channels, start_time)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": f"Inference failed: {e}", "timestamp": datetime.now().isoformat()}

    def _analyze_ecg(self, signal_data, sampling_rate, top_k, is_multi_channel, all_channels, start_time):
        """Analyze ECG data with HuBERT-ECG (12-lead)"""
        if self._model_type != 'hubert-ecg':
            return {"error": "ECG model not loaded or wrong type"}

        # Need 12 leads for HuBERT-ECG
        if all_channels is None or not is_multi_channel:
            return {
                "error": "HuBERT-ECG requires 12-lead ECG data",
                "note": "Please provide all_channels parameter with 12 leads",
                "available_conditions": self._labels[:20],  # Show first 20 conditions
                "total_conditions": len(self._labels),
                "timestamp": datetime.now().isoformat()
            }

        # Extract and preprocess all 12 leads
        lead_signals = []
        for i in range(1, 13):
            lead_name = f"signal_{i}"
            if lead_name in all_channels.columns:
                lead_data = all_channels[lead_name].values
                processed_lead = self._preprocess_ecg_signal(lead_data, original_fs=sampling_rate)
                lead_signals.append(processed_lead)
            else:
                processed_lead = np.zeros(self.ecg_sequence_length, dtype=np.float32)
                lead_signals.append(processed_lead)
                print(f"[Warning] Missing {lead_name}, using zeros")

        # Flatten all 12 leads (12 * 500 = 6000)
        processed = np.concatenate(lead_signals, axis=0)
        tensor = torch.from_numpy(processed).float().unsqueeze(0)

        if self.device is not None:
            tensor = tensor.to(self.device)

        with torch.no_grad():
            inf_start = time.time()
            outputs = self._active_model(tensor)

            if hasattr(outputs, 'last_hidden_state'):
                hidden_states = outputs.last_hidden_state
            elif isinstance(outputs, tuple):
                hidden_states = outputs[0]
            else:
                hidden_states = outputs

            pooled = hidden_states.mean(dim=1)

            if hasattr(self._active_model, 'classifier'):
                logits = self._active_model.classifier(pooled)
            else:
                return {"error": "Model has no classification head"}

            inf_time = time.time() - inf_start
            probs_tensor = F.softmax(logits, dim=-1)
            probs = probs_tensor.cpu().numpy()[0].tolist()

        return self._format_results(probs, top_k, len(processed), sampling_rate,
                                    inf_time, start_time, signal_type="ECG", leads_used=12)

    def _analyze_eeg(self, signal_data, sampling_rate, top_k, is_multi_channel, all_channels, start_time):
        """Analyze EEG data with BIOT (16-channel)"""
        if self._model_type != 'biot-eeg':
            return {"error": "EEG model not loaded or wrong type"}

        # Need 16 channels for BIOT
        if all_channels is None or not is_multi_channel:
            return {
                "error": "BIOT requires 16-channel EEG data",
                "note": "Please provide all_channels parameter with 16 EEG channels",
                "available_conditions": self._labels[:20],  # Show first 20 conditions
                "total_conditions": len(self._labels),
                "timestamp": datetime.now().isoformat()
            }

        # Extract and preprocess 16 channels
        channel_signals = []
        for i in range(1, 17):
            ch_name = f"signal_{i}"
            if ch_name in all_channels.columns:
                ch_data = all_channels[ch_name].values
                processed_ch = self._preprocess_eeg_signal(ch_data, original_fs=sampling_rate)
                channel_signals.append(processed_ch)
            else:
                processed_ch = np.zeros(self.eeg_sequence_length, dtype=np.float32)
                channel_signals.append(processed_ch)
                print(f"[Warning] Missing {ch_name}, using zeros")

        # Stack channels (16, seq_length)
        processed = np.stack(channel_signals, axis=0)
        tensor = torch.from_numpy(processed).float().unsqueeze(0)

        if self.device is not None:
            tensor = tensor.to(self.device)

        with torch.no_grad():
            inf_start = time.time()
            logits = self._active_model(tensor)
            inf_time = time.time() - inf_start

            probs_tensor = F.softmax(logits, dim=-1)
            probs = probs_tensor.cpu().numpy()[0].tolist()

        return self._format_results(probs, top_k, processed.size, sampling_rate,
                                    inf_time, start_time, signal_type="EEG", leads_used=16)

    def _format_results(self, probs, top_k, signal_length, sampling_rate,
                        inf_time, start_time, signal_type="ECG", leads_used=1):
        """Format prediction results"""
        probs_arr = np.array(probs, dtype=float)
        top_k = min(max(1, int(top_k)), probs_arr.size)
        top_idx = np.argsort(probs_arr)[::-1][:top_k]

        pred_results = []
        for idx in top_idx:
            confidence = float(probs_arr[idx])
            label = self._labels[idx] if idx < len(self._labels) else f"Class_{idx}"
            pred_results.append({
                "index": int(idx),
                "label": label,
                "confidence": confidence,
                "confidence_percent": round(confidence * 100.0, 2)
            })

        total_time = time.time() - start_time
        self._last_analysis_time = total_time
        self._total_predictions += 1

        quality = "Low"
        if pred_results:
            c = pred_results[0]['confidence']
            if c >= 0.8:
                quality = "High"
            elif c >= 0.6:
                quality = "Medium"

        return {
            "success": True,
            "predictions": pred_results,
            "raw_probabilities": probs_arr.tolist(),
            "prediction_quality": quality,
            "top_confidence": pred_results[0]['confidence'] if pred_results else 0.0,
            "inference_time_s": round(inf_time, 4),
            "total_time_s": round(total_time, 4),
            "sequence_length": int(signal_length),
            "sampling_rate": sampling_rate,
            "signal_length": int(signal_length),
            "timestamp": datetime.now().isoformat(),
            "prediction_count": self._total_predictions,
            "model_type": self._model_type,
            "signal_type": signal_type,
            "leads_used": leads_used,
            "total_conditions_available": len(self._labels)
        }

    def analyze_patient_data(self, patient_data, channel_name="signal_1", top_k=5, signal_type=None):
        """Analyze patient data (ECG or EEG)"""
        if signal_type is None:
            signal_type = self.signal_type

        try:
            available_channels = [c for c in patient_data.columns if c.startswith('signal_')]

            # Determine if we have multi-channel data
            required_channels = self.ecg_channels if signal_type == "ECG" else self.eeg_channels
            is_multi_channel = len(available_channels) >= required_channels

            estimated_fs = self.ecg_sampling_rate if signal_type == "ECG" else self.eeg_sampling_rate
            if 'time' in patient_data.columns and len(patient_data) > 2:
                diffs = np.diff(patient_data['time'].values.astype(float))
                if np.any(diffs > 0):
                    estimated_fs = 1.0 / np.median(diffs)

            # Use first channel as reference
            sig = patient_data[available_channels[0]].values

            return self.analyze_signal_data(
                sig,
                sampling_rate=estimated_fs,
                top_k=top_k,
                signal_type=signal_type,
                is_multi_channel=is_multi_channel,
                all_channels=patient_data
            )
        except Exception as e:
            return {"error": f"Patient data analysis failed: {e}"}

    def get_model_info(self):
        """Get model information"""
        return {
            "model_loaded": self._model_loaded,
            "signal_type": self.signal_type,
            "ecg_model_path": self.ecg_model_path,
            "eeg_model_path": self.eeg_model_path,
            "num_classes": len(self._labels),
            "ecg_sequence_length": self.ecg_sequence_length,
            "eeg_sequence_length": self.eeg_sequence_length,
            "ecg_channels": self.ecg_channels,
            "eeg_channels": self.eeg_channels,
            "confidence_threshold": self.confidence_threshold,
            "total_predictions": self._total_predictions,
            "last_analysis_time": self._last_analysis_time,
            "model_type": self._model_type,
            "available_ecg_conditions": len(self.ECG_LABELS),
            "available_eeg_conditions": len(self.EEG_LABELS),
            "sample_ecg_conditions": self.ECG_LABELS[:10],
            "sample_eeg_conditions": self.EEG_LABELS[:10]
        }

    def is_ready(self):
        return self._model_loaded and self._active_model is not None

    def switch_signal_type(self, signal_type):
        """
        Switch between ECG and EEG models

        Args:
            signal_type: "ECG" or "EEG"

        Returns:
            bool: True if successful, False otherwise
        """
        if signal_type not in ["ECG", "EEG"]:
            print(f"[Model Loader] Invalid signal type: {signal_type}. Must be 'ECG' or 'EEG'")
            return False

        if signal_type == self.signal_type and self._model_loaded:
            print(f"[Model Loader] Already using {signal_type} model")
            return True

        print(f"[Model Loader] Switching from {self.signal_type} to {signal_type}")
        self.signal_type = signal_type

        # Load labels for new signal type
        self.load_labels(signal_type)

        # Load the appropriate model
        success = self.load_model(signal_type)

        if success:
            print(f"[Model Loader] Successfully switched to {signal_type} model")
        else:
            print(f"[Model Loader] Failed to switch to {signal_type} model")

        return success

    def list_conditions(self, signal_type=None, search_term=None):
        """
        List all available conditions the model can detect

        Args:
            signal_type: "ECG" or "EEG" (uses current if None)
            search_term: Optional search term to filter conditions

        Returns:
            List of condition names
        """
        if signal_type is None:
            signal_type = self.signal_type

        conditions = self.ECG_LABELS if signal_type == "ECG" else self.EEG_LABELS

        if search_term:
            search_lower = search_term.lower()
            conditions = [c for c in conditions if search_lower in c.lower()]

        return {
            "signal_type": signal_type,
            "total_conditions": len(conditions),
            "conditions": conditions,
            "search_term": search_term
        }


# --- BIOT Model Architecture (simplified) ---
class BIOTModel(nn.Module):
    """Simplified BIOT model for EEG analysis"""

    def __init__(self, config):
        super().__init__()
        self.config = config

        input_channels = config.get('input_channels', 16)
        hidden_size = config.get('hidden_size', 512)
        num_layers = config.get('num_layers', 12)
        num_heads = config.get('num_heads', 8)
        dropout = config.get('dropout', 0.1)
        num_classes = config.get('num_classes', 50)

        # Channel embedding
        self.channel_embedding = nn.Linear(input_channels, hidden_size)

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_size,
            nhead=num_heads,
            dim_feedforward=hidden_size * 4,
            dropout=dropout,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Classification head
        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_size),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size // 2, num_classes)
        )

    def forward(self, x):
        # x: (batch, channels, time)
        x = x.permute(0, 2, 1)  # (batch, time, channels)

        # Embed channels
        x = self.channel_embedding(x)  # (batch, time, hidden)

        # Transform
        x = self.transformer(x)  # (batch, time, hidden)

        # Pool and classify
        x = x.mean(dim=1)  # (batch, hidden)
        logits = self.classifier(x)  # (batch, num_classes)

        return logits

# --- Update Global Instance ---
AI_MODEL = ConditionIdentificationModel(
    ecg_model_path="small",  # Will load "Edoardo-BS/hubert-ecg-small"
    eeg_model_path="EEG-PREST-16-channels.ckpt",  # BIOT EEG model
    signal_type="ECG",  # Default to ECG, will switch based on data
    use_huggingface=True
)

#---------- Channel Processing Functions ----------
def derive_third_ecg_channel(sig1, sig2, method="difference"):
    """
    Derive a third ECG channel from two existing channels.

    Args:
        sig1, sig2: numpy arrays of the two ECG channels
        method: "difference", "sum", or "orthogonal"

    Returns:
        numpy array of the derived third channel
    """
    if len(sig1) != len(sig2):
        min_len = min(len(sig1), len(sig2))
        sig1, sig2 = sig1[:min_len], sig2[:min_len]

    if method == "difference":
        # Lead III = Lead II - Lead I (similar to standard ECG lead derivation)
        derived = sig2 - sig1
        print(f"[Channel Derivation] Created third ECG channel using difference method (Lead2 - Lead1)")
    elif method == "sum":
        # Sum of the two leads
        derived = (sig1 + sig2) / 2
        print(f"[Channel Derivation] Created third ECG channel using sum method ((Lead1 + Lead2)/2)")
    elif method == "orthogonal":
        # Create an orthogonal lead using Gram-Schmidt-like process
        # This approximates a perpendicular view
        dot_product = np.dot(sig1, sig2) / (np.linalg.norm(sig1) * np.linalg.norm(sig2))
        derived = sig2 - dot_product * sig1
        print(f"[Channel Derivation] Created third ECG channel using orthogonal method")
    else:
        derived = sig2 - sig1  # Default to difference
        print(f"[Channel Derivation] Created third ECG channel using default difference method")

    return derived


def get_display_channels(patient, dataset_type, show_all_channels=False):
    """
    Get the channels to display based on dataset type and available channels.

    Args:
        patient: patient data dict
        dataset_type: "ECG" or "EEG"
        show_all_channels: whether to show all available channels

    Returns:
        list of channel names to display
    """
    if "ecg" not in patient or patient["ecg"] is None:
        return []

    available_channels = [c for c in patient["ecg"].columns if c.startswith("signal_")]

    if dataset_type == "ECG":
        if len(available_channels) == 0:
            return []
        elif len(available_channels) == 1:
            # Only one channel - duplicate it for now, will handle in visualization
            return [available_channels[0]]
        elif len(available_channels) == 2:
            # Two channels - will derive third in visualization
            return available_channels
        elif len(available_channels) >= 3:
            if show_all_channels:
                return available_channels
            else:
                # Show first 3 channels by default
                return available_channels[:3]

    else:  # EEG
        if len(available_channels) <= 3:
            return available_channels
        else:
            if show_all_channels:
                return available_channels
            else:
                # Show first 3 channels by default for EEG
                return available_channels[:3]

    return available_channels


def process_patient_channels(patient, dataset_type, show_all_channels=False):
    """
    Process patient data to ensure 3 channels for display.
    For ECG: derive third channel if only 2 exist.
    For EEG: limit to 3 main channels unless show_all is True.

    Returns:
        dict with processed channel data and metadata
    """
    if "ecg" not in patient or patient["ecg"] is None:
        return {"channels": [], "derived_info": "No data available"}

    ecg_df = patient["ecg"].copy()
    available_channels = [c for c in ecg_df.columns if c.startswith("signal_")]

    result = {
        "channels": [],
        "derived_info": "",
        "original_count": len(available_channels)
    }

    if dataset_type == "ECG":
        if len(available_channels) == 0:
            result["derived_info"] = "No ECG channels available"
            return result
        elif len(available_channels) == 1:
            # Single channel - create 3 versions for visualization
            ch = available_channels[0]
            result["channels"] = [ch, f"{ch}_copy", f"{ch}_inverted"]
            # Add copies to dataframe
            ecg_df[f"{ch}_copy"] = ecg_df[ch]
            ecg_df[f"{ch}_inverted"] = -ecg_df[ch]  # Inverted for different perspective
            result["derived_info"] = f"Single channel {ch} displayed with copy and inverted version"
        elif len(available_channels) == 2:
            # Two channels - derive third
            ch1, ch2 = available_channels[0], available_channels[1]
            derived_ch = f"derived_{ch1}_{ch2}"
            derived_signal = derive_third_ecg_channel(ecg_df[ch1].values, ecg_df[ch2].values, method="difference")
            ecg_df[derived_ch] = derived_signal
            result["channels"] = [ch1, ch2, derived_ch]
            result["derived_info"] = f"Third channel '{derived_ch}' derived from {ch1} - {ch2}"
        else:
            # Three or more channels
            if show_all_channels:
                result["channels"] = available_channels
                result["derived_info"] = f"Showing all {len(available_channels)} channels"
            else:
                result["channels"] = available_channels[:3]
                result["derived_info"] = f"Showing main 3 channels (out of {len(available_channels)} available)"

    else:  # EEG
        if len(available_channels) <= 3:
            result["channels"] = available_channels
            result["derived_info"] = f"Showing all {len(available_channels)} EEG channels"
        else:
            if show_all_channels:
                result["channels"] = available_channels
                result["derived_info"] = f"Showing all {len(available_channels)} EEG channels"
            else:
                result["channels"] = available_channels[:3]
                result["derived_info"] = f"Showing main 3 EEG channels (out of {len(available_channels)} available)"

    # Update patient data with processed dataframe
    patient["ecg"] = ecg_df
    result["processed_df"] = ecg_df

    return result


# ---------- Utilities ----------
def parse_num(token, default=None):
    if token is None:
        return default
    token = str(token).strip()
    if token == "":
        return default
    try:
        return float(token)
    except:
        pass
    if '/' in token:
        parts = token.split('/')
        for p in parts:
            p = p.strip()
            m = re.search(r'[-+]?\d+(\.\d+)?', p)
            if m:
                try:
                    return float(m.group(0))
                except:
                    continue
    m = re.search(r'[-+]?\d+(\.\d+)?', token)
    if m:
        try:
            return float(m.group(0))
        except:
            return default
    return default


def find_dataset_directory(dataset_type, root="."):
    """
    Updated dataset directory finder that looks for patient-organized structures.
    """
    if dataset_type == "ECG":
        candidates = [
            os.path.join(os.getcwd(), "data", "ptbdb"),
            os.path.join(os.getcwd(), "ptbdb"),
            os.path.join(os.getcwd(), "qtdb_data", "physionet.org", "files", "qtdb", "1.0.0"),
            os.path.join(os.getcwd(), "qtdb"),
            os.path.join(os.getcwd(), "qtdb_data"),
            os.path.join(os.getcwd(), "1.0.0"),
            os.path.join(os.getcwd(), "qtdb", "1.0.0"),
            os.path.join(os.getcwd(), "qtdb-1.0.0"),
        ]

        # Check for patient-organized structure first
        for d in candidates:
            if os.path.isdir(d):
                # Look for patient directories
                patient_dirs = find_patient_directories(d)
                if patient_dirs:
                    return d

                # Fallback: look for .hea files directly
                for rootd, _, files in os.walk(d):
                    for f in files:
                        if f.lower().endswith('.hea'):
                            return d
    else:
        # EEG logic remains the same
        candidates = [
            os.path.join(os.getcwd(), "ASZED-153"),
            os.path.join(os.getcwd(), "ASZED_153"),
            os.path.join(os.getcwd(), "aszed-153"),
            os.path.join(os.getcwd(), "eeg_data"),
        ]

        for d in candidates:
            if os.path.isdir(d):
                for rootd, _, files in os.walk(d):
                    for f in files:
                        if f.lower().endswith('.edf'):
                            return d

    # Fallback: scan root
    for rootd, _, files in os.walk(root):
        for f in files:
            ext = '.hea' if dataset_type == "ECG" else '.edf'
            if f.lower().endswith(ext):
                return rootd
    return None


def get_subject_id_from_path(path):
    """
    Heuristic to extract subject id from file path.
    """
    if not path:
        return None
    m = re.search(r"subject[_\-]?(\d+)", path, flags=re.IGNORECASE)
    if m:
        return f"subject_{int(m.group(1))}"
    parts = re.split(r"[\\/]+", path)
    if len(parts) >= 2:
        for p in reversed(parts[:-1]):
            mm = re.match(r"^(\d+)$", p)
            if mm:
                return f"subject_{int(mm.group(1))}"
            mm2 = re.match(r"^sub[_\-]?(\d+)$", p, flags=re.IGNORECASE)
            if mm2:
                return f"subject_{int(mm2.group(1))}"
        return parts[-2]
    return os.path.basename(path)


def find_all_data_files(root_dir, file_extension):
    """
    Recursively find all data files with given extension in directory tree.
    Groups files by their immediate parent directory.

    Args:
        root_dir: Root directory to search
        file_extension: '.dat' for ECG or '.edf' for EEG

    Returns:
        Dictionary mapping parent_dir -> list of file paths
    """
    grouped_files = {}

    for root, dirs, files in os.walk(root_dir):
        matching_files = [f for f in files if f.lower().endswith(file_extension)]

        if matching_files:
            # Use the immediate parent directory as the group key
            parent_key = os.path.basename(root) or root
            full_paths = [os.path.join(root, f) for f in sorted(matching_files)]

            if parent_key not in grouped_files:
                grouped_files[parent_key] = []
            grouped_files[parent_key].extend(full_paths)

    return grouped_files


def concatenate_ecg_files(file_paths, max_samples=None):
    """
    Vertically concatenate multiple ECG .dat/.hea file pairs.

    Args:
        file_paths: List of .dat or .hea file paths to concatenate
        max_samples: Maximum samples to read (None for all)

    Returns:
        (combined_df, combined_header) or (None, None) on failure
    """
    combined_df = None
    combined_header = None
    total_samples = 0

    for file_path in file_paths:
        # Get corresponding .hea and .dat files
        if file_path.endswith('.hea'):
            hea_path = file_path
            dat_path = file_path.replace('.hea', '.dat')
        elif file_path.endswith('.dat'):
            dat_path = file_path
            hea_path = file_path.replace('.dat', '.hea')
        else:
            continue

        if not os.path.exists(hea_path) or not os.path.exists(dat_path):
            print(f"[concatenate_ecg_files] Missing pair for {file_path}")
            continue

        # Read header and data
        header = read_header_file(hea_path)
        if header is None:
            print(f"[concatenate_ecg_files] Failed to read header: {hea_path}")
            continue

        df = read_dat_file(dat_path, header, max_samples=max_samples)
        if df is None:
            print(f"[concatenate_ecg_files] Failed to read data: {dat_path}")
            continue

        # First file - initialize
        if combined_df is None:
            combined_df = df.copy()
            combined_header = header.copy()
            combined_header['source_files'] = [os.path.basename(file_path)]
            total_samples = len(df)
        else:
            # Subsequent files - concatenate
            # Ensure same number of signal columns
            common_signals = [col for col in df.columns if col.startswith('signal_') and col in combined_df.columns]

            if not common_signals:
                print(f"[concatenate_ecg_files] No matching signal columns in {file_path}")
                continue

            # Adjust time column to continue from previous data
            last_time = combined_df['time'].iloc[-1]
            fs = header.get('sampling_frequency', 250.0)
            time_increment = 1.0 / fs
            df['time'] = df['time'] + last_time + time_increment

            # Concatenate only matching columns
            cols_to_concat = ['time'] + common_signals
            combined_df = pd.concat([combined_df[cols_to_concat], df[cols_to_concat]],
                                    ignore_index=True, axis=0)

            combined_header['source_files'].append(os.path.basename(file_path))
            total_samples += len(df)

    if combined_df is not None:
        combined_header['num_samples'] = total_samples
        combined_header['concatenated_files'] = len(combined_header['source_files'])
        print(f"[concatenate_ecg_files] Combined {len(combined_header['source_files'])} files, "
              f"total samples: {total_samples}")

    return combined_df, combined_header


def concatenate_eeg_files(file_paths, max_samples=None):
    """
    Vertically concatenate multiple EEG .edf files.

    Args:
        file_paths: List of .edf file paths to concatenate
        max_samples: Maximum samples to read per file (None for all)

    Returns:
        (combined_df, combined_header) or (None, None) on failure
    """
    if not PYEDFLIB_AVAILABLE:
        print("[concatenate_eeg_files] pyedflib not available")
        return None, None

    combined_df = None
    combined_header = None
    total_samples = 0

    for file_path in file_paths:
        df, header = read_edf_file(file_path, max_samples=max_samples)

        if df is None:
            print(f"[concatenate_eeg_files] Failed to read: {file_path}")
            continue

        # First file - initialize
        if combined_df is None:
            combined_df = df.copy()
            combined_header = header.copy()
            combined_header['source_files'] = [os.path.basename(file_path)]
            total_samples = len(df)
        else:
            # Subsequent files - concatenate
            # Ensure same number of signal columns
            common_signals = [col for col in df.columns if col.startswith('signal_') and col in combined_df.columns]

            if not common_signals:
                print(f"[concatenate_eeg_files] No matching signal columns in {file_path}")
                continue

            # Adjust time column to continue from previous data
            last_time = combined_df['time'].iloc[-1]
            fs = header.get('sampling_frequency', 250)
            time_increment = 1.0 / fs
            df['time'] = df['time'] + last_time + time_increment

            # Concatenate only matching columns
            cols_to_concat = ['time'] + common_signals
            combined_df = pd.concat([combined_df[cols_to_concat], df[cols_to_concat]],
                                    ignore_index=True, axis=0)

            combined_header['source_files'].append(os.path.basename(file_path))
            total_samples += len(df)

    if combined_df is not None:
        combined_header['num_samples'] = total_samples
        combined_header['concatenated_files'] = len(combined_header['source_files'])
        print(f"[concatenate_eeg_files] Combined {len(combined_header['source_files'])} files, "
              f"total samples: {total_samples}")

    return combined_df, combined_header

def read_header_file(path):
    """Read .hea header (robust)."""
    if not os.path.exists(path):
        return None
    with open(path, "r", errors="ignore") as fh:
        lines = [ln.strip() for ln in fh.readlines() if ln.strip() != ""]
    if not lines:
        return None
    first = lines[0].split()
    record_name = first[0] if len(first) >= 1 else None
    num_signals = parse_num(first[1], default=2) if len(first) >= 2 else 2
    fs = parse_num(first[2], default=250.0) if len(first) >= 3 else 250.0
    num_samples = parse_num(first[3], default=225000) if len(first) >= 4 else 225000
    try:
        num_signals = int(num_signals)
    except:
        num_signals = int(max(1, math.floor(num_signals))) if num_signals else 2
    try:
        fs = float(fs)
    except:
        fs = 250.0
    try:
        num_samples = int(num_samples)
    except:
        num_samples = int(225000)
    signals_raw = []
    if len(lines) > 1:
        for ln in lines[1:]:
            signals_raw.append(ln.split())
    return {
        "record_name": record_name,
        "num_signals": num_signals,
        "sampling_frequency": fs,
        "num_samples": num_samples,
        "signals_raw": signals_raw
    }


def read_dat_file(dat_path, header_info, max_samples=None):
    """Read MIT/PhysioNet .dat interleaved int16. Return pandas DataFrame or None on failure."""
    if not os.path.exists(dat_path) or header_info is None:
        return None
    try:
        raw = np.fromfile(dat_path, dtype=np.int16)
        n_signals = max(1, int(header_info.get("num_signals", 2)))
        total_samples = raw.shape[0] // n_signals
        if total_samples <= 0:
            return None
        raw = raw[: total_samples * n_signals]
        mat = raw.reshape((total_samples, n_signals))
        gains = np.ones(n_signals) * 200.0
        for i in range(min(n_signals, len(header_info.get("signals_raw", [])))):
            parts = header_info["signals_raw"][i]
            if len(parts) >= 3:
                g = parse_num(parts[2], default=None)
                if g and g > 0:
                    gains[i] = g
        cols = [f"signal_{i + 1}" for i in range(n_signals)]
        df = pd.DataFrame(mat[:, :n_signals].astype(float) / gains[:n_signals], columns=cols)
        fs = header_info.get("sampling_frequency", 250.0)
        df.insert(0, "time", np.arange(df.shape[0]) / float(fs))
        if max_samples is not None:
            df = df.iloc[: int(max_samples)].reset_index(drop=True)
        return df
    except Exception as e:
        print(f"[read_dat_file] error reading {dat_path}: {e}")
        return None


def find_patient_directories(data_dir):
    """
    Find all patient directories in the dataset.
    Looks for directories named like 'patient001', 'patient002', etc.
    """
    patient_dirs = []

    if not os.path.isdir(data_dir):
        return patient_dirs

    for item in os.listdir(data_dir):
        item_path = os.path.join(data_dir, item)
        if os.path.isdir(item_path):
            # Check if it looks like a patient directory
            if (item.lower().startswith('patient') or
                    item.lower().startswith('subject') or
                    item.isdigit()):  # Some datasets use just numbers
                patient_dirs.append(item_path)

    return sorted(patient_dirs)


def get_patient_records(patient_dir):
    """
    Get all ECG records (hea/dat file pairs) for a specific patient.
    Returns list of record base names (without extensions).
    """
    if not os.path.isdir(patient_dir):
        return []

    records = []
    files = os.listdir(patient_dir)

    # Find all .hea files and extract base names
    for f in files:
        if f.lower().endswith('.hea'):
            base_name = os.path.splitext(f)[0]
            # Check if corresponding .dat file exists
            dat_file = os.path.join(patient_dir, f"{base_name}.dat")
            if os.path.exists(dat_file):
                records.append({
                    'base_name': base_name,
                    'hea_path': os.path.join(patient_dir, f),
                    'dat_path': dat_file
                })

    return records


def load_patient_record(record_info, max_samples=None):
    """
    Load a single ECG record (hea + dat file pair).
    Returns DataFrame with all channels from that record.
    """
    hea_path = record_info['hea_path']
    dat_path = record_info['dat_path']

    # Read header
    header = read_header_file(hea_path)
    if header is None:
        return None, None

    # Read data
    df = read_dat_file(dat_path, header, max_samples=max_samples)
    if df is None:
        return None, None

    # Add record identifier to column names to avoid conflicts when combining
    base_name = record_info['base_name']
    signal_cols = [c for c in df.columns if c.startswith('signal_')]
    rename_dict = {}
    for i, col in enumerate(signal_cols):
        rename_dict[col] = f"signal_{base_name}_{i + 1}"

    df.rename(columns=rename_dict, inplace=True)

    return df, header


def combine_patient_records(patient_dir, max_samples=None, max_records_per_patient=None):
    """
    Combine all ECG records for a single patient into one DataFrame.
    Each record contributes its channels with unique names.
    """
    records = get_patient_records(patient_dir)
    if not records:
        return None, None

    # Limit records per patient if specified
    if max_records_per_patient:
        records = records[:max_records_per_patient]

    combined_df = None
    combined_header = None
    total_channels = 0

    for i, record_info in enumerate(records):
        try:
            df, header = load_patient_record(record_info, max_samples)
            if df is None:
                print(f"[combine_patient_records] Failed to load record {record_info['base_name']}")
                continue

            if combined_df is None:
                # First record - use as base
                combined_df = df.copy()
                combined_header = header.copy()
                combined_header['records'] = [record_info['base_name']]
            else:
                # Additional records - merge
                if len(df) != len(combined_df):
                    # Handle different lengths by taking minimum
                    min_len = min(len(df), len(combined_df))
                    df = df.iloc[:min_len].reset_index(drop=True)
                    combined_df = combined_df.iloc[:min_len].reset_index(drop=True)

                # Add signal columns from this record
                signal_cols = [c for c in df.columns if c.startswith('signal_')]
                for col in signal_cols:
                    combined_df[col] = df[col].values

                combined_header['records'].append(record_info['base_name'])

            # Count channels added
            record_channels = len([c for c in df.columns if c.startswith('signal_')])
            total_channels += record_channels

        except Exception as e:
            print(f"[combine_patient_records] Error processing record {record_info['base_name']}: {e}")
            continue

    if combined_df is not None:
        # Update header with combined info
        combined_header['num_signals'] = len([c for c in combined_df.columns if c.startswith('signal_')])
        combined_header['combined_records'] = len(records)
        combined_header['total_channels'] = total_channels

        print(
            f"[combine_patient_records] Combined {len(records)} records into {combined_header['num_signals']} total channels")

    return combined_df, combined_header


def read_edf_file(edf_path, max_samples=None, attempts=8):
    """
    Read EDF file using pyedflib. Returns (df, header) or (None, None) and prints error.
    """
    if not PYEDFLIB_AVAILABLE:
        print("pyedflib not installed. Please: pip install pyedflib")
        return None, None

    last_exc = None
    backoff = 0.05
    for attempt in range(attempts):
        try:
            f = pyedflib.EdfReader(edf_path)
            try:
                try:
                    n_signals = int(f.signals_in_file)
                except Exception:
                    n_signals = int(getattr(f, "signals_in_file", 0) or 0)
                if n_signals <= 0:
                    raise ValueError("No signals in EDF")
                nsamps = f.getNSamples()
                if isinstance(nsamps, (list, tuple, np.ndarray)):
                    min_samples = int(min(nsamps))
                else:
                    min_samples = int(nsamps)
                use_samples = min_samples if max_samples is None else min(min_samples, int(max_samples))
                fs = None
                try:
                    fs = int(f.getSampleFrequency(0))
                except Exception:
                    try:
                        dur = getattr(f, "getFileDuration", lambda: None)()
                        if dur:
                            fs = max(1, int(round(use_samples / float(dur))))
                        else:
                            fs = 250
                    except Exception:
                        fs = 250
                data = np.zeros((use_samples, n_signals), dtype=float)
                for ch in range(n_signals):
                    sig = f.readSignal(ch)
                    if sig is None:
                        sig = np.zeros(use_samples, dtype=float)
                    if len(sig) >= use_samples:
                        sig_use = np.asarray(sig[:use_samples], dtype=float)
                    else:
                        sig_use = np.empty(use_samples, dtype=float)
                        sig_use[:len(sig)] = sig
                        sig_use[len(sig):] = np.nan
                    data[:, ch] = sig_use
                cols = [f"signal_{i + 1}" for i in range(n_signals)]
                df = pd.DataFrame(data, columns=cols)
                df.insert(0, "time", np.arange(use_samples) / float(fs))
                header = {
                    "sampling_frequency": fs,
                    "num_signals": n_signals,
                    "record_name": os.path.basename(edf_path),
                    "num_samples": use_samples
                }
                return df, header
            finally:
                try:
                    f.close()
                except Exception:
                    try:
                        f._close()
                    except Exception:
                        pass
                try:
                    del f
                except Exception:
                    pass
        except Exception as e:
            last_exc = e
            msg = str(e).lower()
            if ("already been opened" in msg) or ("file has already been opened" in msg) or (
                    "resource temporarily unavailable" in msg) or ("i/o error" in msg):
                time.sleep(backoff)
                backoff = min(0.5, backoff * 1.8)
                continue
            time.sleep(backoff)
            backoff = min(0.5, backoff * 1.8)
            continue
    print(f"[read_edf_file] Error reading {edf_path}: {last_exc}")
    return None, None


def apply_signal_filtering(signal, fs, signal_type="ECG"):
    """Bandpass filter for ECG/EEG (simple, zero-phase)."""
    if signal is None or len(signal) < 3:
        return signal
    if signal_type == "ECG":
        low_cutoff, high_cutoff = 0.5, 40.0
    else:  # EEG
        low_cutoff, high_cutoff = 0.5, 70.0
    nyq = fs / 2.0
    low = max(low_cutoff / nyq, 1e-6)
    high = min(high_cutoff / nyq, 0.9999)
    try:
        b, a = butter(4, [low, high], btype='band')
        filtered = filtfilt(b, a, signal)
        return filtered
    except Exception:
        return signal


# ---------- Load patients ----------
def load_patient_data(data_dir, dataset_type="ECG", max_samples=None, max_patients=None,
                      max_records_per_patient=5):
    """
    Load and concatenate all data files found in directory tree.
    Groups files by their immediate parent directory and concatenates vertically.

    Args:
        data_dir: Root directory to search
        dataset_type: "ECG" or "EEG"
        max_samples: Max samples to read per file (None for all)
        max_patients: Maximum number of patient groups to load
        max_records_per_patient: Maximum files to concatenate per group

    Returns:
        List of patient records with concatenated data
    """
    patients = []

    if dataset_type == "ECG":
        file_ext = '.dat'
        concat_func = concatenate_ecg_files
    else:  # EEG
        if not PYEDFLIB_AVAILABLE:
            print("pyedflib is required to read EDF files. Please install: pip install pyedflib")
            return []
        file_ext = '.edf'
        concat_func = concatenate_eeg_files

    # Find all data files grouped by parent directory
    grouped_files = find_all_data_files(data_dir, file_ext)

    if not grouped_files:
        print(f"[load_patient_data] No {dataset_type} files found in {data_dir}")
        return []

    print(f"[load_patient_data] Found {len(grouped_files)} groups of {dataset_type} files")

    # Process each group
    for group_idx, (group_name, file_paths) in enumerate(sorted(grouped_files.items())):
        if max_patients is not None and group_idx >= max_patients:
            break

        print(f"[load_patient_data] Processing group '{group_name}' with {len(file_paths)} files...")

        # Limit files per group if specified
        if max_records_per_patient:
            file_paths = file_paths[:max_records_per_patient]

        # Concatenate all files in this group
        combined_df, combined_header = concat_func(file_paths, max_samples=max_samples)

        if combined_df is None:
            print(f"[load_patient_data] Failed to load group '{group_name}'")
            continue

        # Apply filtering to all signal columns
        fs = combined_header.get("sampling_frequency", 250)
        signal_cols = [c for c in combined_df.columns if c.startswith("signal_")]

        for col in signal_cols:
            combined_df[col] = apply_signal_filtering(combined_df[col].values, fs, dataset_type)

        # Create patient record
        patient_record = {
            "name": group_name,
            "header": combined_header,
            "ecg": combined_df,  # Note: still called 'ecg' even for EEG for compatibility
            "type": dataset_type,
            "source_directory": os.path.dirname(file_paths[0]),
            "files_concatenated": len(file_paths),
            "total_samples": combined_header.get('num_samples', len(combined_df)),
            "total_channels": len(signal_cols)
        }

        patients.append(patient_record)
        print(f"[load_patient_data] Loaded '{group_name}': {len(file_paths)} files, "
              f"{len(combined_df)} samples, {len(signal_cols)} channels")

    print(f"[load_patient_data] Successfully loaded {len(patients)} patient groups total")
    return patients

# ---------- Feature functions ----------
def extract_ecg_features(ecg_df, fs=250):
    features = {}
    if ecg_df is None:
        return features
    for col in ecg_df.columns:
        if not col.startswith("signal_"):
            continue
        sig = ecg_df[col].values
        try:
            height = np.quantile(sig, 0.85)
            peaks, _ = find_peaks(sig, height=height, distance=int(0.3 * fs))
            if peaks.size > 1:
                rr = np.diff(peaks) / fs
                features[col] = {"peaks": peaks.tolist(), "rr": rr.tolist()}
            else:
                features[col] = {"peaks": peaks.tolist(), "rr": []}
        except Exception:
            features[col] = {"peaks": [], "rr": []}
    return features


def extract_eeg_features(eeg_df, fs=250):
    features = {}
    if eeg_df is None:
        return features
    try:
        from scipy import signal as sp_signal
    except Exception:
        return features
    bands = {
        'delta': (0.5, 4),
        'theta': (4, 8),
        'alpha': (8, 13),
        'beta': (13, 30),
        'gamma': (30, 70)
    }
    for col in eeg_df.columns:
        if not col.startswith("signal_"):
            continue
        sig = eeg_df[col].values
        try:
            freqs, psd = sp_signal.welch(sig, fs, nperseg=min(1024, max(256, len(sig) // 4)))
            band_pows = {}
            for band, (lo, hi) in bands.items():
                mask = (freqs >= lo) & (freqs <= hi)
                band_pows[band] = float(np.trapz(psd[mask], freqs[mask])) if np.any(mask) else 0.0
            total = sum(band_pows.values()) if sum(band_pows.values()) > 0 else 1.0
            rel = {f"{k}_rel": v / total for k, v in band_pows.items()}
            features[col] = {**band_pows, **rel}
        except Exception:
            features[col] = {b: 0.0 for b in bands.keys()}
    return features



# Make sure to include the AI_MODEL at the end
AI_MODEL = ConditionIdentificationModel(
    ecg_model_path="small",
    eeg_model_path="EEG-PREST-16-channels.ckpt",
    signal_type="ECG",
    use_huggingface=True
)