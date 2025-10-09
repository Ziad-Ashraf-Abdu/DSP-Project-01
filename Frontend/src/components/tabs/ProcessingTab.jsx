// components/tabs/ProcessingTab.js
import React, { useState } from 'react';
import { Paper, Typography, Box, Slider, Button, Grid } from '@mui/material';

const ProcessingTab = ({ onThresholdApply, onExport }) => {
  const [threshold, setThreshold] = useState(50);

  const handleThresholdChange = (event, newValue) => {
    setThreshold(newValue);
  };

  const handleApplyThreshold = () => {
    onThresholdApply(threshold);
  };

  const handleExport = (type) => {
    onExport(type);
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {/* Threshold Processing */}
      <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="h6" gutterBottom>
          Threshold Processing
        </Typography>
        <Box>
          <Slider
            value={threshold}
            onChange={handleThresholdChange}
            min={0}
            max={100}
            step={1}
            valueLabelDisplay="auto"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleApplyThreshold}
            fullWidth
            sx={{
              py: 1,
              backgroundColor: '#2563EB',
              '&:hover': {
                backgroundColor: '#1D4ED8'
              }
            }}
          >
            Apply Threshold Filter
          </Button>
        </Box>
      </Paper>

      {/* Export Options */}
      <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="h6" gutterBottom>
          Export Options
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              onClick={() => handleExport('stats')}
              fullWidth
              sx={{ py: 1 }}
            >
              Export Statistics (CSV)
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              onClick={() => handleExport('image')}
              fullWidth
              sx={{ py: 1 }}
            >
              Export Processed Image
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              onClick={() => handleExport('histogram')}
              fullWidth
              sx={{ py: 1 }}
            >
              Export Histogram Data
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="outlined"
              onClick={() => {/* PDF generation placeholder */}}
              fullWidth
              sx={{ py: 1 }}
            >
              Generate Report (PDF - Placeholder)
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProcessingTab;