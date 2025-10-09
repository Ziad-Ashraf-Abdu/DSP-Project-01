// components/tabs/AnalysisTab.js
import React from 'react';
import { Paper, Typography, Box, Grid } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AnalysisTab = ({ data }) => {
  const { histogram, speckle_stats } = data;

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {/* Histogram */}
      <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="h6" gutterBottom>
          Intensity Distribution Histogram
        </Typography>
        <Box sx={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="intensity" 
                stroke="#9CA3AF"
                label={{ value: 'Intensity', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: 4
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Speckle Metrics */}
      <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Typography variant="h6" gutterBottom>
          Speckle & Noise Metrics
        </Typography>
        <Grid container spacing={1}>
          {speckle_stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper sx={{ 
                p: 2, 
                backgroundColor: 'rgba(255,255,255,0.02)',
                textAlign: 'center'
              }}>
                <Typography variant="caption" color="primary.light" display="block">
                  {stat.metric}
                </Typography>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography 
                  variant="body2" 
                  color={
                    stat.status === 'Good' || stat.status === 'High' 
                      ? 'success.main' 
                      : 'warning.main'
                  }
                >
                  {stat.status}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default AnalysisTab;