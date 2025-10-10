import React from "react";

const PatientSelector = ({
  patients,
  selectedPatients,
  onSelectionChange,
  selectedChannels,
  onChannelsChange,
  overlayMode,
  onOverlayModeChange,
}) => {
  if (!patients || patients.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <p className="text-gray-400">
          No patients loaded. Please load data first.
        </p>
      </div>
    );
  }

  const availableChannels =
    patients.find((p) => p.id === selectedPatients[0])?.channels || [];

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-green-400">
        Patient & Channel Selection
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Patients
          </label>
          <select
            multiple
            value={selectedPatients}
            onChange={(e) =>
              onSelectionChange(
                Array.from(e.target.selectedOptions, (option) =>
                  parseInt(option.value)
                )
              )
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-32 text-white"
            size={Math.min(patients.length, 8)}
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.type}) - {patient.total_samples}{" "}
                samples
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-1">
            {selectedPatients.length} patient(s) selected
          </p>
        </div>

        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Channels
          </label>
          <select
            multiple
            value={selectedChannels}
            onChange={(e) =>
              onChannelsChange(
                Array.from(e.target.selectedOptions, (option) => option.value)
              )
            }
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 h-24 text-white"
            size={Math.min(availableChannels.length, 6)}
          >
            {availableChannels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-400 mt-1">
            {selectedChannels.length} channel(s) selected
          </p>

          {/* Display Mode */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Display Mode
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="overlay"
                  checked={overlayMode === "overlay"}
                  onChange={(e) => onOverlayModeChange(e.target.value)}
                  className="mr-2"
                />
                Overlay on same graph
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="separate"
                  checked={overlayMode === "separate"}
                  onChange={(e) => onOverlayModeChange(e.target.value)}
                  className="mr-2"
                />
                Separate subplots
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientSelector;
