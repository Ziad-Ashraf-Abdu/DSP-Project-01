import React from 'react';
import { BarChart3, Layers, Grid, Zap, Crosshair } from 'lucide-react';

const VisualizationControls = ({ 
  visualizationType, 
  overlayMode, 
  onVisualizationChange, 
  onOverlayModeChange 
}) => {
  const visualizationOptions = [
    { 
      value: 'icu', 
      label: 'Standard Monitor',
      description: 'Real-time signal display',
      icon: BarChart3
    },
    { 
      value: 'pingpong', 
      label: 'Ping-Pong Display',
      description: 'XOR overlay comparison',
      icon: Layers
    },
    { 
      value: 'polar', 
      label: 'Polar RR Intervals',
      description: 'Circular rhythm analysis',
      icon: Grid
    },
    { 
      value: 'crossrec', 
      label: 'Cross Recurrence',
      description: 'Channel correlation map',
      icon: Crosshair
    }
  ];

  const getVisualizationIcon = (type) => {
    const option = visualizationOptions.find(opt => opt.value === type);
    return option ? option.icon : BarChart3;
  };

  const CurrentIcon = getVisualizationIcon(visualizationType);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <Zap size={16} />
        Visualization
      </h3>

      <div style={styles.controlGroup}>
        <label style={styles.label}>Visualization Type:</label>
        <div style={styles.visualizationGrid}>
          {visualizationOptions.map(option => {
            const Icon = option.icon;
            const isActive = visualizationType === option.value;
            return (
              <div
                key={option.value}
                style={{
                  ...styles.visualizationOption,
                  ...(isActive ? styles.visualizationActive : styles.visualizationInactive)
                }}
                onClick={() => onVisualizationChange(option.value)}
                title={option.description}
              >
                <div style={styles.visualizationIcon}>
                  <Icon size={14} />
                </div>
                <div style={styles.visualizationText}>
                  <div style={styles.visualizationLabel}>{option.label}</div>
                  <div style={styles.visualizationDesc}>{option.description}</div>
                </div>
                {isActive && (
                  <div style={styles.activeIndicator}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>Display Mode:</label>
        <div style={styles.modeOptions}>
          <div
            style={{
              ...styles.modeOption,
              ...(overlayMode === 'overlay' ? styles.modeActive : styles.modeInactive)
            }}
            onClick={() => onOverlayModeChange('overlay')}
          >
            <Layers size={14} />
            <span>Overlay</span>
            <div style={styles.modeDescription}>Channels on same graph</div>
          </div>
          <div
            style={{
              ...styles.modeOption,
              ...(overlayMode === 'separate' ? styles.modeActive : styles.modeInactive)
            }}
            onClick={() => onOverlayModeChange('separate')}
          >
            <BarChart3 size={14} />
            <span>Separate</span>
            <div style={styles.modeDescription}>Individual subplots</div>
          </div>
        </div>
      </div>

      <div style={styles.currentSelection}>
        <div style={styles.currentLabel}>Current:</div>
        <div style={styles.currentValue}>
          <CurrentIcon size={12} />
          {visualizationOptions.find(opt => opt.value === visualizationType)?.label}
          <span style={styles.modeBadge}>
            {overlayMode === 'overlay' ? 'Overlay' : 'Separate'}
          </span>
        </div>
      </div>
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
  visualizationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  visualizationOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    border: '1px solid transparent'
  },
  visualizationActive: {
    backgroundColor: '#003300',
    borderColor: '#00ff41'
  },
  visualizationInactive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333'
  },
  visualizationIcon: {
    padding: '4px',
    borderRadius: '4px',
    backgroundColor: '#333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  visualizationText: {
    flex: 1,
    minWidth: 0
  },
  visualizationLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#fff',
    marginBottom: '2px'
  },
  visualizationDesc: {
    fontSize: '10px',
    color: '#888',
    lineHeight: '1.2'
  },
  activeIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#00ff41'
  },
  modeOptions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  modeOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  modeActive: {
    backgroundColor: '#003300',
    border: '1px solid #00ff41'
  },
  modeInactive: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333'
  },
  modeDescription: {
    fontSize: '10px',
    color: '#888',
    marginTop: '2px'
  },
  currentSelection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: '#1a1a1a',
    borderRadius: '4px',
    border: '1px solid #333'
  },
  currentLabel: {
    fontSize: '12px',
    color: '#888'
  },
  currentValue: {
    fontSize: '12px',
    color: '#00ff41',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '500'
  },
  modeBadge: {
    backgroundColor: '#333',
    color: '#ccc',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px'
  }
};

export default VisualizationControls;