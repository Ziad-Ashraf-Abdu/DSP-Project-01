import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Cpu, Database, Camera } from 'lucide-react';

const SystemStatus = ({ systemInfo }) => {
  if (!systemInfo) {
    return (
      <div style={styles.container}>
        <div style={styles.statusItem}>
          <AlertCircle size={14} color="#ffd700" />
          <span>Loading system info...</span>
        </div>
      </div>
    );
  }

  const StatusIcon = ({ condition, tooltip }) => (
    <div style={styles.statusIcon} title={tooltip}>
      {condition ? 
        <CheckCircle size={16} color="#00ff41" /> : 
        <XCircle size={16} color="#ff6347" />
      }
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.statusGrid}>
        <div style={styles.statusItem}>
          <Cpu size={14} />
          <span>Backend</span>
          <StatusIcon condition={true} tooltip="Backend server running" />
        </div>
        
        <div style={styles.statusItem}>
          <Database size={14} />
          <span>EEG Support</span>
          <StatusIcon 
            condition={systemInfo.pyedflib_available} 
            tooltip={systemInfo.pyedflib_available ? 
              "EDF file support enabled" : 
              "Install pyedflib for EEG support"
            } 
          />
        </div>
        
        <div style={styles.statusItem}>
          <Camera size={14} />
          <span>Screenshot</span>
          <StatusIcon 
            condition={systemInfo.screenshot_available} 
            tooltip={systemInfo.screenshot_available ? 
              "Graph capture enabled" : 
              "Install kaleido for 2D analysis"
            } 
          />
        </div>
        
        <div style={styles.statusItem}>
          <CheckCircle size={14} />
          <span>AI Model</span>
          <StatusIcon 
            condition={systemInfo.ai_model_ready} 
            tooltip={systemInfo.ai_model_ready ? 
              "AI model loaded" : 
              "AI model not ready"
            } 
          />
        </div>
        
        <div style={styles.statusItem}>
          <span>Patients:</span>
          <span style={styles.value}>{systemInfo.patients_loaded}</span>
        </div>
        
        <div style={styles.statusItem}>
          <span>Type:</span>
          <span style={styles.value}>{systemInfo.dataset_type}</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#111',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #333'
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    fontSize: '12px'
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#ccc'
  },
  statusIcon: {
    display: 'flex',
    alignItems: 'center'
  },
  value: {
    color: '#00ff41',
    fontWeight: 'bold',
    marginLeft: '4px'
  }
};

export default SystemStatus;