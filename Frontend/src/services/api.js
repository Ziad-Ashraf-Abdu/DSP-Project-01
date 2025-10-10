import axios from "axios";

const API_BASE = "http://localhost:8052";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const medicalAPI = {
  // Health check
  healthCheck: () => api.get("/api/health"),

  // Data loading
  loadData: (datasetType, dataDir = "") =>
    api.post("/api/load-data", {
      dataset_type: datasetType,
      data_dir: dataDir,
    }),

  // Patient management
  getPatients: () => api.get("/api/patients"),
  getPatient: (patientId) => api.get(`/api/patients/${patientId}`),
  getPatientData: (patientId, start = 0, end = null) => {
    const params = { start };
    if (end) params.end = end;
    return api.get(`/api/patients/${patientId}/data`, { params });
  },

  // Visualization
  getVisualizationData: (selection) =>
    api.post("/api/visualization/data", selection),

  // Playback control
  playbackControl: (control) => api.post("/api/playback/control", control),

  playbackUpdate: () => api.post("/api/playback/update"),

  // AI Analysis
  aiAnalyze: (request) => api.post("/api/ai/analyze", request),

  getAIModelInfo: () => api.get("/api/ai/model-info"),

  switchAIModel: (signalType) =>
    api.post("/api/ai/switch-model", null, {
      params: { signal_type: signalType },
    }),

  // System info
  getSystemInfo: () => api.get("/api/system/info"),
};

export default api;
