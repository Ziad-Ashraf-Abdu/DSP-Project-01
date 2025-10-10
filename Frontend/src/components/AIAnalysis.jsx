import React, { useState } from "react";
import { Brain, Image as ImageIcon } from "lucide-react";
import { medicalAPI } from "../services/api";

const AIAnalysis = ({ selectedPatients, datasetType, currentPositions }) => {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("1d");

  const runAnalysis = async (analysisType) => {
    if (selectedPatients.length === 0) return;

    try {
      setLoading(true);
      const request = {
        patient_id: selectedPatients[0],
        analysis_type: analysisType,
        signal_type: datasetType,
        current_position: currentPositions[selectedPatients[0]] || 0,
      };

      const response = await medicalAPI.aiAnalyze(request);
      setAnalysisResult(response.data);
      setActiveTab(analysisType);
    } catch (error) {
      console.error("AI analysis error:", error);
      setAnalysisResult({
        error: error.response?.data?.detail || "Analysis failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPrediction = (pred, index) => {
    const confidence = pred.confidence || pred.probability || 0;
    const confidencePercent = (confidence * 100).toFixed(1);
    const label = pred.label || pred.class || "Unknown";

    let confidenceColor = "text-red-400";
    let icon = "·";

    if (confidence >= 0.8) {
      confidenceColor = "text-green-400";
      icon = "✓";
    } else if (confidence >= 0.6) {
      confidenceColor = "text-yellow-400";
      icon = "○";
    } else if (confidence >= 0.4) {
      confidenceColor = "text-orange-400";
      icon = "△";
    }

    return (
      <div key={index} className="border-b border-gray-700 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-lg mr-2">{icon}</span>
            <span className="font-medium text-white">{label}</span>
          </div>
          <div className={`font-bold ${confidenceColor}`}>
            {confidencePercent}%
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full ${
              confidence >= 0.8
                ? "bg-green-500"
                : confidence >= 0.6
                ? "bg-yellow-500"
                : confidence >= 0.4
                ? "bg-orange-500"
                : "bg-red-500"
            }`}
            style={{ width: `${confidence * 100}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-green-400">
        AI-Based Analysis
      </h3>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => runAnalysis("1d")}
          disabled={loading || selectedPatients.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-4 py-2 rounded flex items-center text-white disabled:cursor-not-allowed"
        >
          <Brain size={20} className="mr-2" />
          Run 1D AI Analysis
        </button>

        <button
          onClick={() => runAnalysis("2d")}
          disabled={loading || selectedPatients.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-4 py-2 rounded flex items-center text-white disabled:cursor-not-allowed"
        >
          <ImageIcon size={20} className="mr-2" />
          Run 2D AI Analysis
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
          <p className="text-gray-400 mt-2">Analyzing...</p>
        </div>
      )}

      {analysisResult && !loading && (
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex border-b border-gray-700 mb-4">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "1d"
                  ? "text-green-400 border-b-2 border-green-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("1d")}
            >
              1D Analysis
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "2d"
                  ? "text-green-400 border-b-2 border-green-400"
                  : "text-gray-400"
              }`}
              onClick={() => setActiveTab("2d")}
            >
              2D Analysis
            </button>
          </div>

          {analysisResult.error ? (
            <div className="text-red-400 p-4 bg-red-900 rounded">
              Error: {analysisResult.error}
            </div>
          ) : analysisResult.result?.predictions ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="text-sm text-gray-400">
                  <strong>Type:</strong>{" "}
                  {analysisResult.analysis_type.toUpperCase()}
                </div>
                <div className="text-sm text-gray-400">
                  <strong>Signal:</strong> {analysisResult.signal_type}
                </div>
              </div>

              <div className="space-y-2">
                {analysisResult.result.predictions
                  .slice(0, 5)
                  .map(renderPrediction)}
              </div>

              {analysisResult.result.prediction_quality && (
                <div className="mt-4 p-3 bg-gray-700 rounded">
                  <strong>Quality:</strong>{" "}
                  {analysisResult.result.prediction_quality}
                </div>
              )}
            </div>
          ) : analysisResult.result?.success === false ? (
            <div className="text-yellow-400 p-4 bg-yellow-900 rounded">
              {analysisResult.result.note ||
                "Analysis completed but no predictions available"}
            </div>
          ) : (
            <div className="text-gray-400 p-4">
              No analysis results available
            </div>
          )}

          {analysisResult.timestamp && (
            <div className="text-xs text-gray-500 mt-4 text-right">
              Analyzed: {new Date(analysisResult.timestamp).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
