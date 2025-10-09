// frontend/src/components/FrequencyDisplay.js
import React from 'react';
import { Card } from 'react-bootstrap';

const FrequencyDisplay = ({ emittedFreq, perceivedFreq, timeElapsed, isRunning }) => {
  const status = isRunning ? "Running" : (timeElapsed > 0 ? "Paused" : "Stopped");
  
  const displayText = isRunning 
    ? `🔊 Emitted: ${emittedFreq} Hz → Perceived: ${perceivedFreq} Hz | Time: ${timeElapsed.toFixed(1)} s`
    : `${status} | Emitted: ${emittedFreq} Hz → Perceived: ${perceivedFreq} Hz | Time: ${timeElapsed.toFixed(1)} s`;

  return (
    <Card className="frequency-display-card">
      <Card.Body>
        <div className="frequency-text">
          {displayText}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FrequencyDisplay;