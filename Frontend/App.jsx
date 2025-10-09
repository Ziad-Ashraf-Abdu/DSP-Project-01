// App.js - Main React Application
import React, { useState, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Alert,
  CircularProgress
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ImageUpload from './components/ImageUpload';
import AnalysisTabs from './components/AnalysisTabs';
import { analyzeImage, applyThreshold, exportData } from './services/api';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Arial", sans-serif',
  },
});

function App() {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleImageUpload = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await analyzeImage(formData);
      setAnalysisData(result);
      setActiveTab('overview');
    } catch (err) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleThresholdApply = useCallback(async (thresholdValue) => {
    if (!analysisData) return;
    
    setLoading(true);
    try {
      const result = await applyThreshold({
        original_image: analysisData.original_image,
        threshold: thresholdValue
      });
      
      setAnalysisData(prev => ({
        ...prev,
        ...result,
        original_image: prev.original_image // Keep original unchanged
      }));
    } catch (err) {
      setError(err.message || 'Failed to apply threshold');
    } finally {
      setLoading(false);
    }
  }, [analysisData]);

  const handleExport = useCallback(async (type) => {
    if (!analysisData) return;
    
    try {
      await exportData(type, analysisData);
    } catch (err) {
      setError(err.message || `Failed to export ${type}`);
    }
  }, [analysisData]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #0b1220 50%, #022047 100%)',
          color: 'white',
          py: 3,
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              SAR Data Analysis Platform
            </Typography>
            <Typography variant="h6" color="primary.light">
              Synthetic Aperture Radar Signal Processing & Feature Extraction
            </Typography>
          </Box>

          {/* Upload Section */}
          <ImageUpload onImageUpload={handleImageUpload} />

          {/* Loading Indicator */}
          {loading && (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ my: 2 }}>
              {error}
            </Alert>
          )}

          {/* Analysis Content */}
          {analysisData && !loading && (
            <AnalysisTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              data={analysisData}
              onThresholdApply={handleThresholdApply}
              onExport={handleExport}
            />
          )}

          {/* Empty State */}
          {!analysisData && !loading && (
            <Box
              sx={{
                p: 6,
                textAlign: 'center',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 2,
                mt: 3
              }}
            >
              <Typography variant="h5" color="primary.light" gutterBottom>
                Upload SAR data to begin analysis
              </Typography>
              <Typography color="text.secondary">
                Waiting for input...
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;