import React from 'react';
import { Play, Pause, Square, FastForward, RotateCcw } from 'lucide-react';

const PlaybackControls = ({ playbackState, onPlaybackStateChange, onPlaybackControl, disabled }) => {
  const handleSpeedChange = (speed) => {
    onPlaybackStateChange({ ...playbackState, speed });
  };

  const handleChunkMsChange = (chunkMs) => {
    onPlaybackStateChange({ ...playbackState, chunkMs: Math.max(20, chunkMs) });
  };

  const handleWindowChange = (displayWindow) => {
    onPlaybackStateChange({ ...playbackState, displayWindow: Math.max(1, displayWindow) });
  };

  const speedMarks = {
    0.5: '0.5x',
    1: '1x',
    2: '2x',
    5: '5x',
    10: '10x'
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Playback Controls</h3>

      <div style={styles.controlGroup}>
        <label style={styles.label}>
          Speed: <span style={styles.value}>{playbackState.speed}x</span>
        </label>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={playbackState.speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            style={styles.slider}
            disabled={disabled}
          />
          <div style={styles.speedMarks}>
            {Object.entries(speedMarks).map(([value, label]) => (
              <span key={value} style={styles.speedMark}>{label}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.controlRow}>
        <div style={styles.control}>
          <label style={styles.label}>
            <FastForward size={12} />
            Update (ms)
          </label>
          <input
            type="number"
            value={playbackState.chunkMs}
            onChange={(e) => handleChunkMsChange(parseInt(e.target.value) || 200)}
            style={{
              ...styles.numberInput,
              ...(disabled ? styles.inputDisabled : {})
            }}
            min="20"
            step="10"
            disabled={disabled}
          />
        </div>
        
        <div style={styles.control}>
          <label style={styles.label}>
            <RotateCcw size={12} />
            Window (s)
          </label>
          <input
            type="number"
            value={playbackState.displayWindow}
            onChange={(e) => handleWindowChange(parseFloat(e.target.value) || 8)}
            style={{
              ...styles.numberInput,
              ...(disabled ? styles.inputDisabled : {})
            }}
            min="1"
            step="1"
            disabled={disabled}
          />
        </div>
      </div>

      <div style={styles.buttonGroup}>
        <button 
          onClick={() => onPlaybackControl('play')}
          style={{
            ...styles.button,
            ...styles.playButton,
            ...(playbackState.playing ? styles.buttonActive : {}),
            ...(disabled ? styles.buttonDisabled : {})
          }}
          disabled={disabled || playbackState.playing}
          title="Start playback"
        >
          <Play size={16} />
          Play
        </button>
        
        <button 
          onClick={() => onPlaybackControl('pause')}
          style={{
            ...styles.button,
            ...styles.pauseButton,
            ...(!playbackState.playing ? styles.buttonActive : {}),
            ...(disabled ? styles.buttonDisabled : {})
          }}
          disabled={disabled || !playbackState.playing}
          title="Pause playback"
        >
          <Pause size={16} />
          Pause
        </button>
        
        <button 
          onClick={() => onPlaybackControl('reset')}
          style={{
            ...styles.button,
            ...styles.resetButton,
            ...(disabled ? styles.buttonDisabled : {})
          }}
          disabled={disabled}
          title="Reset to beginning"
        >
          <Square size={16} />
          Reset
        </button>
      </div>

      {playbackState.positions && playbackState.positions.length > 0 && (
        <div style={styles.positionInfo}>
          <div style={styles.positionLabel}>Current Positions:</div>
          <div style={styles.positions}>
            {playbackState.positions.map((pos, idx) => (
              <span key={idx} style={styles.position}>
                P{idx}: {pos}
              </span>
            ))}
          </div>
        </div>
      )}

      {disabled && (
        <div style={styles.disabledOverlay}>
          <span>Load data to enable playback</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#111',
    padding: '12px',
    borderRadius: '6px',
    position: 'relative'
  },
  title: {
    color: '#00ff41',
    margin: '0 0 12px 0',
    fontSize: '16px'
  },
  controlGroup: {
    marginBottom: '16px'
  },
  controlRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  control: {
    flex: 1
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    color: '#ccc',
    fontSize: '13px',
    fontWeight: '500'
  },
  value: {
    color: '#00ff41',
    fontWeight: 'bold'
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#333',
    outline: 'none',
    opacity: 1,
    transition: 'background 0.2s',
    WebkitAppearance: 'none'
  },
  sliderDisabled: {
    opacity: 0.5
  },
  speedMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    color: '#666'
  },
  speedMark: {
    flex: 1,
    textAlign: 'center'
  },
  numberInput: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#333',
    border: '1px solid #555',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px'
  },
  inputDisabled: {
    backgroundColor: '#222',
    borderColor: '#444',
    color: '#666'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
  },
  button: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  buttonActive: {
    transform: 'scale(0.98)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  playButton: {
    backgroundColor: '#00aa00',
    color: 'white'
  },
  pauseButton: {
    backgroundColor: '#ffa500',
    color: 'white'
  },
  resetButton: {
    backgroundColor: '#cc0000',
    color: 'white'
  },
  positionInfo: {
    backgroundColor: '#1a1a1a',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #333'
  },
  positionLabel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px'
  },
  positions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    fontSize: '10px',
    color: '#ccc'
  },
  position: {
    backgroundColor: '#333',
    padding: '2px 6px',
    borderRadius: '3px'
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    color: '#666',
    fontSize: '12px'
  }
};

// Add custom slider styles
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00ff41;
    cursor: pointer;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00ff41;
    cursor: pointer;
    border: none;
  }
`, styleSheet.cssRules.length);

export default PlaybackControls;