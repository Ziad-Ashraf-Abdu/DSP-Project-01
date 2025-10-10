import React from "react";
import { Play, Pause, RefreshCw } from "lucide-react";
import { medicalAPI } from "../services/api";

const PlaybackControls = ({
  isPlaying,
  onPlayPause,
  onReset,
  speed,
  onSpeedChange,
  chunkMs,
  onChunkMsChange,
  displayWindow,
  onDisplayWindowChange,
  selectedPatients,
}) => {
  const handlePlayPause = async () => {
    try {
      await medicalAPI.playbackControl({
        action: isPlaying ? "pause" : "play",
        speed,
        chunk_ms: chunkMs,
        display_window: displayWindow,
      });
      onPlayPause(!isPlaying);
    } catch (error) {
      console.error("Playback control error:", error);
    }
  };

  const handleReset = async () => {
    try {
      await medicalAPI.playbackControl({
        action: "reset",
        speed,
        chunk_ms: chunkMs,
        display_window: displayWindow,
      });
      onReset();
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-green-400">
        Playback Controls
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Speed</label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1 text-center">{speed}x</div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Update Interval (ms)
          </label>
          <input
            type="number"
            value={chunkMs}
            onChange={(e) => onChunkMsChange(parseInt(e.target.value))}
            min="20"
            step="10"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Window (s)</label>
          <input
            type="number"
            value={displayWindow}
            onChange={(e) => onDisplayWindowChange(parseFloat(e.target.value))}
            min="1"
            step="1"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="flex items-end space-x-2">
          <button
            onClick={handlePlayPause}
            disabled={selectedPatients.length === 0}
            className={`flex-1 px-4 py-2 rounded flex items-center justify-center ${
              isPlaying
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-green-600 hover:bg-green-700"
            } disabled:bg-gray-600 disabled:cursor-not-allowed text-white`}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            <span className="ml-2">{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={selectedPatients.length === 0}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center justify-center text-white disabled:cursor-not-allowed"
          >
            <RefreshCw size={20} />
            <span className="ml-2">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;
