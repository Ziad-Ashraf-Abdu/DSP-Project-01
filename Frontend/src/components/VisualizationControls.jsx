import React from "react";

const VisualizationControls = ({ vizType, onVizTypeChange }) => {
  const visualizationTypes = [
    { value: "icu", label: "Standard Cyclical Monitor" },
    { value: "pingpong", label: "Ping-Pong Display" },
    { value: "polar", label: "Polar RR Intervals" },
    { value: "crossrec", label: "Cross Recurrence Plot" },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-green-400">
        Visualization
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visualizationTypes.map((viz) => (
          <button
            key={viz.value}
            onClick={() => onVizTypeChange(viz.value)}
            className={`p-4 rounded-lg text-center transition-colors ${
              vizType === viz.value
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {viz.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VisualizationControls;
