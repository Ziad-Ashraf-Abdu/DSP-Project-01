import React, { useState } from 'react';
import { Upload, FolderOpen, AlertCircle } from 'lucide-react';

const DataLoader = ({ onLoadData, datasetType, loading }) => {
  const [dataDir, setDataDir] = useState('./data');
  const [localDatasetType, setLocalDatasetType] = useState(datasetType);

  const handleLoad = () => {
    if (dataDir.trim()) {
      onLoadData(localDatasetType, dataDir);
    }
  };

  const handleDatasetTypeChange = (newType) => {
    setLocalDatasetType(newType);
    // Auto-load with new type if we already have a directory
    if (dataDir.trim()) {
      onLoadData(newType, dataDir);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <FolderOpen size={16} />
        Data Configuration
      </h3>
      
      <div style={styles.controlGroup}>
        <label style={styles.label}>Signal Type:</label>
        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="ECG"
              checked={localDatasetType === 'ECG'}
              onChange={(e) => handleDatasetTypeChange(e.target.value)}
              disabled={loading}
            />
            <span style={localDatasetType === 'ECG' ? styles.radioActive : styles.radioInactive}>
              ECG
            </span>
          </label>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              value="EEG"
              checked={localDatasetType === 'EEG'}
              onChange={(e) => handleDatasetTypeChange(e.target.value)}
              disabled={loading}
            />
            <span style={localDatasetType === 'EEG' ? styles.radioActive : styles.radioInactive}>
              EEG
            </span>
          </label>
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>Data Directory:</label>
        <input
          type="text"
          value={dataDir}
          onChange={(e) => setDataDir(e.target.value)}
          placeholder="./data"
          style={styles.input}
          disabled={loading}
        />
        <div style={styles.helpText}>
          Leave empty for auto-detection, or specify path to .hea/.dat (ECG) or .edf (EEG) files
        </div>
      </div>

      <button 
        onClick={handleLoad} 
        style={{
          ...styles.button,
          ...(loading ? styles.buttonDisabled : styles.buttonActive)
        }}
        disabled={loading}
      >
        {loading ? (
          <>
            <div style={styles.spinner}></div>
            Loading...
          </>
        ) : (
          <>
            <Upload size={16} />
            Load Data
          </>
        )}
      </button>

      {localDatasetType === 'EEG' && (
        <div style={styles.warning}>
          <AlertCircle size={14} />
          <span>EEG support requires pyedflib. Install with: pip install pyedflib</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#111',
    padding: '12px',
    borderRadius: '6px'
  },
  title: {
    color: '#00ff41',
    margin: '0 0 12px 0',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  controlGroup: {
    marginBottom: '12px'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    color: '#ccc',
    fontSize: '14px'
  },
  radioGroup: {
    display: 'flex',
    gap: '12px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer'
  },
  radioActive: {
    color: '#00ff41',
    fontWeight: 'bold'
  },
  radioInactive: {
    color: '#ccc'
  },
  input: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px'
  },
  helpText: {
    fontSize: '11px',
    color: '#888',
    marginTop: '4px',
    fontStyle: 'italic'
  },
  button: {
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  buttonActive: {
    backgroundColor: '#007acc',
    color: 'white'
  },
  buttonDisabled: {
    backgroundColor: '#555',
    color: '#999',
    cursor: 'not-allowed'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  warning: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#332200',
    color: '#ffd700',
    padding: '8px',
    borderRadius: '4px',
    marginTop: '8px',
    fontSize: '11px'
  }
};

export default DataLoader;