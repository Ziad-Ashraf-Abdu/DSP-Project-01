// components/tabs/OverviewTab.js
import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

const OverviewTab = ({ data }) => {
  const { stats, processed_image } = data;

  const displayStats = [
    'mean', 'median', 'stdDev', 'min', 'max', 'p1', 'p99', 'pixels'
  ];

  return (
    <Grid container spacing={2}>
      {/* Image Display */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Typography variant="h6" gutterBottom>
            SAR Intensity Image
          </Typography>
          <Box
            component="img"
            src={`data:image/png;base64,${processed_image}`}
            sx={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 1,
              border: '1px solid rgba(255,255,255,0.05)'
            }}
            alt="SAR Processed Image"
          />
        </Paper>
      </Grid>

      {/* Statistics */}
      <Grid item xs={12} md={4}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="h6" gutterBottom>
              Signal Statistics
            </Typography>
            <Grid container spacing={1}>
              {displayStats.map((stat) => (
                <Grid item xs={6} key={stat}>
                  <Paper sx={{ 
                    p: 1, 
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="caption" color="primary.light" display="block">
                      {stat.replace('Dev', ' Dev')}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {stats[stat]}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <Typography variant="h6" gutterBottom>
              Quick Info
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2" color="grey.400">
                  Polarization
                </Typography>
                <Typography variant="body2" color="primary.light">
                  VH (Vertical-Horizontal)
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="grey.400">
                  Resolution
                </Typography>
                <Typography variant="body2" color="primary.light">
                  {stats.width} × {stats.height} pixels
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;