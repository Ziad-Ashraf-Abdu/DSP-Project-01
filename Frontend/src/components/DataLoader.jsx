import React, { useState } from "react";
import { medicalAPI } from "../services/api";

const DataLoader = ({ onDataLoaded, datasetType, onDatasetTypeChange }) => {
  const [dataDir, setDataDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLoadData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await medicalAPI.loadData(datasetType, dataDir);

      if (response.data.success) {
        setMessage(response.data.message);
        if (onDataLoaded) {
          onDataLoaded(response.data.patients);
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-green-400">Data Loader</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Signal Type</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="ECG"
                checked={datasetType === "ECG"}
                onChange={(e) => onDatasetTypeChange(e.target.value)}
                className="mr-2"
              />
              ECG
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="EEG"
                checked={datasetType === "EEG"}
                onChange={(e) => onDatasetTypeChange(e.target.value)}
                className="mr-2"
              />
              EEG
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Data Directory (optional)
          </label>
          <input
            type="text"
            value={dataDir}
            onChange={(e) => setDataDir(e.target.value)}
            placeholder="Leave empty for auto-detection"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleLoadData}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-4 py-2 rounded text-white"
          >
            {loading ? "Loading..." : "Load Data"}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded ${
            message.includes("Loaded")
              ? "bg-green-900 text-green-300"
              : "bg-red-900 text-red-300"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default DataLoader;
