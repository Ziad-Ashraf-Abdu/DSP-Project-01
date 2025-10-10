import React, { useState, useEffect, useRef } from "react";
import DataLoader from "./components/DataLoader";
import PatientSelector from "./components/PatientSelector";
import VisualizationControls from "./components/VisualizationControls";
import PlaybackControls from "./components/PlaybackControls";
import AIAnalysis from "./components/AIAnalysis";
import SystemStatus from "./components/SystemStatus";
import { medicalAPI } from "./services/api";
import "./App.css";

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [datasetType, setDatasetType] = useState("ECG");
  const [vizType, setVizType] = useState("icu");
  const [overlayMode, setOverlayMode] = useState("overlay");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [chunkMs, setChunkMs] = useState(200);
  const [displayWindow, setDisplayWindow] = useState(8);
  const [currentPositions, setCurrentPositions] = useState({});

  const playbackIntervalRef = useRef();

  // Playback update effect
  useEffect(() => {
    const updatePlayback = async () => {
      if (!isPlaying || selectedPatients.length === 0) return;

      try {
        const response = await medicalAPI.playbackUpdate();
        if (response.data.success) {
          setCurrentPositions((prev) => {
            const newPositions = { ...prev };
            response.data.positions.forEach((pos, idx) => {
              newPositions[idx] = pos;
            });
            return newPositions;
          });

          if (response.data.all_finished) {
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error("Playback update error:", error);
      }
    };

    if (isPlaying) {
      playbackIntervalRef.current = setInterval(updatePlayback, chunkMs);
    } else {
      clearInterval(playbackIntervalRef.current);
    }

    return () => clearInterval(playbackIntervalRef.current);
  }, [isPlaying, chunkMs, selectedPatients]);

  const handleDataLoaded = (loadedPatients) => {
    setPatients(loadedPatients);
    setSelectedPatients([]);
    setSelectedChannels([]);
    setCurrentPositions({});
  };

  const handleReset = () => {
    setCurrentPositions({});
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2">
            Enhanced ECG/EEG Real-time Monitor with AI Analysis
          </h1>
          <p className="text-gray-400">
            Medical signal visualization and analysis platform
          </p>
        </header>

        <SystemStatus />

        <DataLoader
          onDataLoaded={handleDataLoaded}
          datasetType={datasetType}
          onDatasetTypeChange={setDatasetType}
        />

        <PatientSelector
          patients={patients}
          selectedPatients={selectedPatients}
          onSelectionChange={setSelectedPatients}
          selectedChannels={selectedChannels}
          onChannelsChange={setSelectedChannels}
          overlayMode={overlayMode}
          onOverlayModeChange={setOverlayMode}
        />

        <VisualizationControls vizType={vizType} onVizTypeChange={setVizType} />

        <PlaybackControls
          isPlaying={isPlaying}
          onPlayPause={setIsPlaying}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={setSpeed}
          chunkMs={chunkMs}
          onChunkMsChange={setChunkMs}
          displayWindow={displayWindow}
          onDisplayWindowChange={setDisplayWindow}
          selectedPatients={selectedPatients}
        />

        <AIAnalysis
          selectedPatients={selectedPatients}
          datasetType={datasetType}
          currentPositions={currentPositions}
        />

        {/* Visualization display area would go here */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-400">
            Visualization Display
          </h3>
          <div className="h-96 bg-gray-900 rounded flex items-center justify-center text-gray-500">
            Visualization will appear here when patients are selected and
            playback starts
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
