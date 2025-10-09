// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import SimulationGraph from './components/SimulationGraph.jsx';
import Controls from './components/Controls.jsx';
import AudioAnalysis from './components/AudioAnalysis.jsx';
import H5Summary from './components/H5Summary.jsx';
import FrequencyDisplay from './components/FrequencyDisplay.jsx';
import ControlButtons from './components/ControlButtons.jsx';
import { analyzeAudio, getH5Stats, calculateSimulation } from './services/api.jsx';
import { useAudio } from './hooks/useAudio.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Constants - same as in the original Dash app
const AUDIO_FILE = "CitroenC4Picasso_51.wav";
const H5_FILE = "speed_estimations_NN_1000-200-50-10-1_reg1e-3_lossMSE.h5";

function App() {
  const [simulationState, setSimulationState] = useState({
    isRunning: false,
    timeElapsed: 0,
    params: {
      source_type: 'moving',
      observer_type: 'moving',
      source_x0: -200,
      source_y0: 0,
      observer_x0: 0,
      observer_y0: 0,
      source_speed: 30,
      source_dir: 0,
      observer_speed: 10,
      observer_dir: 180,
      f_emit: 500,
      time_elapsed: 0
    }
  });

  const [simulationData, setSimulationData] = useState({
    src_x: -200,
    src_y: 0,
    obs_x: 0,
    obs_y: 0,
    perceived_freq: 500,
    waves: []
  });

  const [h5Stats, setH5Stats] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const intervalRef = useRef(null);
  const { playFrequency, stopSound, toggleMute, isMuted } = useAudio();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [h5Data, audioAnalysis] = await Promise.all([
        getH5Stats(),
        analyzeAudio()
      ]);
      setH5Stats(h5Data);
      setAudioData(audioAnalysis);

      if (audioAnalysis.audio_loaded) {
        setSimulationState(prev => ({
          ...prev,
          params: {
            ...prev.params,
            f_emit: audioAnalysis.dominant_freq
          }
        }));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Simulation interval
  useEffect(() => {
    if (simulationState.isRunning) {
      intervalRef.current = setInterval(async () => {
        setSimulationState(prev => {
          const newTime = parseFloat((prev.timeElapsed + 0.1).toFixed(4));
          const newParams = {
            ...prev.params,
            time_elapsed: newTime
          };

          // Update simulation
          updateSimulation(newParams);

          return {
            ...prev,
            timeElapsed: newTime,
            params: newParams
          };
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulationState.isRunning]);

  // Sound control
  useEffect(() => {
    if (simulationState.isRunning && !isMuted) {
      playFrequency(simulationData.perceived_freq);
    } else {
      stopSound();
    }
  }, [simulationData.perceived_freq, simulationState.isRunning, isMuted, playFrequency, stopSound]);

  const updateSimulation = async (params) => {
    try {
      const data = await calculateSimulation(params);
      setSimulationData(data);
    } catch (error) {
      console.error('Error updating simulation:', error);
    }
  };

  const handleStart = () => {
    setSimulationState(prev => ({ ...prev, isRunning: true }));
  };

  const handlePause = () => {
    setSimulationState(prev => ({ ...prev, isRunning: false }));
  };

  const handleReset = () => {
    setSimulationState(prev => ({
      isRunning: false,
      timeElapsed: 0,
      params: {
        ...prev.params,
        time_elapsed: 0
      }
    }));
    setSimulationData({
      src_x: -200,
      src_y: 0,
      obs_x: 0,
      obs_y: 0,
      perceived_freq: simulationState.params.f_emit,
      waves: []
    });
  };

  const handleParamChange = (param, value) => {
    setSimulationState(prev => ({
      ...prev,
      params: {
        ...prev.params,
        [param]: value
      }
    }));
  };

  const handleUseAudioFrequency = () => {
    if (audioData) {
      handleParamChange('f_emit', Math.round(audioData.dominant_freq));
    }
  };

  return (
      <div className="App">
        {/* Header */}
        <div className="app-header">
          <Container fluid>
            <Row>
              <Col>
                <h1>🔊 Advanced Doppler Effect Simulator</h1>
                <p>Interactive Physics Simulation with Real-Time Audio & Frequency Analysis</p>
              </Col>
            </Row>
          </Container>
        </div>

        {/* HDF5 Summary */}
        {h5Stats && (
            <Container fluid className="mb-4">
              <Row>
                <Col>
                  <H5Summary stats={h5Stats} audioFile={AUDIO_FILE} />
                </Col>
              </Row>
            </Container>
        )}

        {/* Audio Analysis */}
        {audioData && audioData.audio_loaded && (
            <Container fluid className="mb-4">
              <AudioAnalysis
                  data={audioData}
                  audioFile={AUDIO_FILE}
                  onUseFrequency={handleUseAudioFrequency}
              />
            </Container>
        )}

        {/* Controls */}
        <Container fluid className="mb-4">
          <Controls
              params={simulationState.params}
              onParamChange={handleParamChange}
          />
        </Container>

        {/* Frequency Input */}
        <Container fluid className="mb-4 text-center">
          <div className="frequency-input-container">
            <label htmlFor="freq-input" className="frequency-label">
              Emitted Frequency (Hz):
            </label>
            <input
                id="freq-input"
                type="number"
                value={simulationState.params.f_emit}
                onChange={(e) => handleParamChange('f_emit', parseFloat(e.target.value) || 500)}
                className="frequency-input"
            />
          </div>
        </Container>

        {/* Control Buttons */}
        <Container fluid className="mb-4 text-center">
          <ControlButtons
              isRunning={simulationState.isRunning}
              isMuted={isMuted}
              onStart={handleStart}
              onPause={handlePause}
              onReset={handleReset}
              onToggleMute={toggleMute}
          />
        </Container>

        {/* Frequency Display */}
        <Container fluid className="mb-4">
          <FrequencyDisplay
              emittedFreq={simulationState.params.f_emit}
              perceivedFreq={simulationData.perceived_freq}
              timeElapsed={simulationState.timeElapsed}
              isRunning={simulationState.isRunning}
          />
        </Container>

        {/* Simulation Graph */}
        <Container fluid>
          <SimulationGraph
              simulationData={simulationData}
              params={simulationState.params}
              timeElapsed={simulationState.timeElapsed}
          />
        </Container>
      </div>
  );
}

export default App;