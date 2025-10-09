import React from 'react';
import { Users, Activity, Sliders } from 'lucide-react';

const PatientSelector = ({ 
  patients, 
  selectedPatients, 
  selectedChannels, 
  onPatientsChange, 
  onChannelsChange 
}) => {
  const handlePatientChange = (patientId) => {
    if (selectedPatients.includes(patientId)) {
      onPatientsChange(selectedPatients.filter(id => id !== patientId));
    } else {
      onPatientsChange([...selectedPatients, patientId]);
    }
  };

  const handleChannelChange = (channel) => {
    if (selectedChannels.includes(channel)) {
      onChannelsChange(selectedChannels.filter(ch => ch !== channel));
    } else {
      onChannelsChange([...selectedChannels, channel]);
    }
  };

  const selectAllChannels = () => {
    if (selectedPatients.length > 0) {
      const firstPatient = patients[selectedPatients[0]];
      if (firstPatient && firstPatient.channels) {
        onChannelsChange([...firstPatient.channels]);
      }
    }
  };

  const clearAllChannels = () => {
    onChannelsChange([]);
  };

  const getAvailableChannels = () => {
    if (selectedPatients.length === 0) return [];
    const firstPatient = patients[selectedPatients[0]];
    return firstPatient?.channels || [];
  };

  const availableChannels = getAvailableChannels();

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <Users size={16} />
        Patient Selection
      </h3>

      <div style={styles.controlGroup}>
        <label style={styles.label}>Select Patients ({patients.length} available):</label>
        <div style={styles.patientList}>
          {patients.map(patient => (
            <label key={patient.id} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedPatients.includes(patient.id)}
                onChange={() => handlePatientChange(patient.id)}
                style={styles.checkbox}
              />
              <div style={styles.patientInfo}>
                <span style={styles.patientName}>{patient.name}</span>
                <span style={styles.patientDetails}>
                  {patient.type} • {patient.total_channels} ch • {patient.total_samples} samples
                </span>
              </div>
            </label>
          ))}
          {patients.length === 0 && (
            <div style={styles.emptyState}>
              <Activity size={20} />
              <span>No patients loaded</span>
              <span style={styles.emptySubtitle}>Load data to see patients</span>
            </div>
          )}
        </div>
      </div>

      {selectedPatients.length > 0 && (
        <div style={styles.controlGroup}>
          <div style={styles.channelHeader}>
            <label style={styles.label}>
              Select Channels ({availableChannels.length} available):
            </label>
            <div style={styles.channelActions}>
              <button 
                onClick={selectAllChannels}
                style={styles.smallButton}
                title="Select all channels"
              >
                All
              </button>
              <button 
                onClick={clearAllChannels}
                style={styles.smallButton}
                title="Clear selection"
              >
                None
              </button>
            </div>
          </div>
          <div style={styles.channelList}>
            {availableChannels.map(channel => (
              <label key={channel} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(channel)}
                  onChange={() => handleChannelChange(channel)}
                  style={styles.checkbox}
                />
                <Sliders size={12} />
                <span style={styles.channelName}>{channel}</span>
              </label>
            ))}
          </div>
          <div style={styles.selectionInfo}>
            {selectedChannels.length} of {availableChannels.length} channels selected
            {selectedChannels.length === 0 && (
              <span style={styles.warning}> • No channels selected</span>
            )}
          </div>
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
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#ccc',
    fontSize: '14px',
    fontWeight: '500'
  },
  patientList: {
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    color: '#ccc',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease'
  },
  checkboxLabelHover: {
    backgroundColor: '#1a1a1a'
  },
  checkbox: {
    marginTop: '2px'
  },
  patientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  patientName: {
    fontWeight: '500',
    color: '#fff'
  },
  patientDetails: {
    fontSize: '11px',
    color: '#888'
  },
  channelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  channelActions: {
    display: 'flex',
    gap: '4px'
  },
  smallButton: {
    backgroundColor: '#333',
    color: '#ccc',
    border: 'none',
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '10px',
    cursor: 'pointer'
  },
  channelList: {
    maxHeight: '150px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  channelName: {
    fontSize: '13px'
  },
  selectionInfo: {
    fontSize: '11px',
    color: '#888',
    marginTop: '8px',
    fontStyle: 'italic'
  },
  warning: {
    color: '#ffa500'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px',
    color: '#666',
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: '11px',
    color: '#555'
  }
};

export default PatientSelector;