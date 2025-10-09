// components/tabs/FeaturesTab.js
import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

const FeaturesTab = ({ data }) => {
  const { features } = data;

  const classifications = [
    { type: 'Urban/Built-up', confidence: 78 },
    { type: 'Vegetation', confidence: 45 },
    { type: 'Water Bodies', confidence: 62 },
    { type: 'Bare Soil', confidence: 34 }
  ];

  return (
    <Grid container spacing={2}>
      {/* Detected Features */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Typography variant="h6" gutterBottom>
            Detected Features
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {features.map((feature, index) => (
              <Paper 
                key={index}
                sx={{ 
                  p: 1.5, 
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  mb: 1
                }}
              >
                <Typography variant="body1" fontWeight="bold">
                  {feature.feature}
                </Typography>
                <Typography variant="body2" color="primary.light">
                  {feature.value}
                </Typography>
                <Typography variant="caption" color="grey.400">
                  {feature.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      </Grid>

      {/* Target Classification */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
          <Typography variant="h6" gutterBottom>
            Target Classification
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {classifications.map((item, index) => (
              <Box key={index}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">{item.type}</Typography>
                </Box>
                <Box 
                  sx={{ 
                    height: 8, 
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 1,
                    overflow: 'hidden'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: `${item.confidence}%`, 
                      height: '100%', 
                      backgroundColor: '#F87171',
                      borderRadius: 1
                    }} 
                  />
                </Box>
                <Typography variant="caption" color="primary.light" sx={{ mt: 0.5 }}>
                  {item.confidence}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default FeaturesTab;