// services/api.js
const API_BASE_URL = 'http://localhost:8000';

export const analyzeImage = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
};

export const applyThreshold = async (thresholdData) => {
  const response = await fetch(`${API_BASE_URL}/apply-threshold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(thresholdData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Threshold application failed');
  }

  return response.json();
};

export const exportData = async (type, data) => {
  let endpoint = '';
  let body = {};

  switch (type) {
    case 'stats':
      endpoint = '/export-stats';
      body = { stats: data.stats };
      break;
    case 'image':
      endpoint = '/export-image';
      body = { processed_image: data.processed_image };
      break;
    case 'histogram':
      endpoint = '/export-histogram';
      body = { histogram: data.histogram };
      break;
    default:
      throw new Error('Unknown export type');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Export ${type} failed`);
  }

  // Handle file download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Extract filename from content-disposition header
  const contentDisposition = response.headers.get('content-disposition');
  let filename = `sar_export.${type === 'image' ? 'png' : 'csv'}`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};