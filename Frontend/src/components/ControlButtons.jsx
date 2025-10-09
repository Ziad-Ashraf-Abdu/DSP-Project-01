// frontend/src/components/ControlButtons.js
import React from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';

const ControlButtons = ({ isRunning, isMuted, onStart, onPause, onReset, onToggleMute }) => {
  return (
    <ButtonGroup>
      <Button 
        variant="success" 
        onClick={onStart}
        disabled={isRunning}
        className="control-btn"
      >
        ▶️ Start
      </Button>
      <Button 
        variant="warning" 
        onClick={onPause}
        disabled={!isRunning}
        className="control-btn"
      >
        ⏸️ Pause
      </Button>
      <Button 
        variant="danger" 
        onClick={onReset}
        className="control-btn"
      >
        ⏹️ Reset
      </Button>
      <Button 
        variant="primary" 
        onClick={onToggleMute}
        className="control-btn"
      >
        {isMuted ? '🔊 Unmute' : '🔇 Mute'}
      </Button>
    </ButtonGroup>
  );
};

export default ControlButtons;