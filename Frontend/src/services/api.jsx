// src/services/api.js
const API_BASE_URL = 'http://localhost:8000/api';

export const getH5Stats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/h5-stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch H5 stats');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching H5 stats:', error);
    return {
      loaded: false,
      mode: null,
      mean: null,
      count: 0,
      used_key: null,
      error: error.message
    };
  }
};

export const analyzeAudio = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio-analysis`);
    if (!response.ok) {
      throw new Error('Failed to analyze audio');
    }
    return await response.json();
  } catch (error) {
    console.error('Error analyzing audio:', error);
    return {
      dominant_freq: 500,
      spectrum_data: {},
      audio_loaded: false
    };
  }
};

export const calculateSimulation = async (params) => {
  try {
    const response = await fetch(`${API_BASE_URL}/simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate simulation');
    }
    return await response.json();
  } catch (error) {
    console.error('Error calculating simulation:', error);
    // Return default simulation data
    return {
      src_x: params.source_x0 || -200,
      src_y: params.source_y0 || 0,
      obs_x: params.observer_x0 || 0,
      obs_y: params.observer_y0 || 0,
      perceived_freq: params.f_emit || 500,
      waves: []
    };
  }
};