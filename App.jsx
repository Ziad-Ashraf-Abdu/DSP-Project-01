import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

const API_BASE = 'http://localhost:8000';

const App = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [waveformData, setWaveformData] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [classificationResult, setClassificationResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setUploadedFile(file);
    setError('');
    setClassificationResult('');
    setWaveformData([]);

    // Create object URL for audio preview
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Reset results
    setClassificationResult('');
  }, []);

  const handleClassify = async () => {
    if (!uploadedFile) {
      setError('Please upload an audio file first');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await axios.post(`${API_BASE}/process-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      setWaveformData(data.waveform_data);
      setClassificationResult(data.classification);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during classification');
      console.error('Classification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const input = document.getElementById('file-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleFileUpload({ target: { files: dt.files } });
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '30px', maxWidth: '800px', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>🎤 Drone Sound Detection</h2>

      {/* File Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          width: '100%',
          height: '80px',
          lineHeight: '80px',
          borderWidth: '2px',
          borderStyle: 'dashed',
          borderRadius: '10px',
          textAlign: 'center',
          marginBottom: '20px',
          cursor: 'pointer',
          backgroundColor: '#f9f9f9',
        }}
      >
        <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block', height: '100%' }}>
          📂 Drag & Drop or <span style={{ color: '#007bff', textDecoration: 'underline' }}>Select an Audio File</span>
        </label>
        <input
          id="file-input"
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* File Name */}
      {fileName && (
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          Uploaded file: {fileName}
        </div>
      )}

      {/* Waveform Plot */}
      {waveformData.length > 0 && (
        <div style={{ height: '250px', marginBottom: '20px' }}>
          <Plot
            data={[
              {
                y: waveformData,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'blue' },
              },
            ]}
            layout={{
              margin: { l: 40, r: 40, t: 20, b: 40 },
              height: 250,
              xaxis: { title: 'Samples' },
              yaxis: { title: 'Amplitude' },
            }}
            config={{ displayModeBar: false }}
          />
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <audio
          controls
          src={audioUrl}
          style={{ width: '100%', marginTop: '10px', marginBottom: '20px' }}
        />
      )}

      {/* Classify Button */}
      <button
        onClick={handleClassify}
        disabled={isLoading || !uploadedFile}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: isLoading ? '#cccccc' : '#4CAF50',
          color: 'white',
          fontSize: '16px',
          cursor: uploadedFile && !isLoading ? 'pointer' : 'not-allowed',
          opacity: uploadedFile && !isLoading ? 1 : 0.6,
        }}
      >
        {isLoading ? '🔄 Processing...' : '🚀 Classify'}
      </button>

      {/* Error Message */}
      {error && (
        <div style={{ marginTop: '20px', color: '#d32f2f', fontWeight: 'bold' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Classification Result */}
      {classificationResult && (
        <div style={{ 
          marginTop: '20px', 
          fontSize: '18px', 
          fontWeight: 'bold', 
          color: '#333',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          {classificationResult}
        </div>
      )}
    </div>
  );
};

export default App;