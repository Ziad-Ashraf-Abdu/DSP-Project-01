// components/AnalysisTabs.js
import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import OverviewTab from './tabs/OverviewTab';
import AnalysisTab from './tabs/AnalysisTab';
import FeaturesTab from './tabs/FeaturesTab';
import ProcessingTab from './tabs/ProcessingTab';

const AnalysisTabs = ({ activeTab, onTabChange, data, onThresholdApply, onExport }) => {
  const handleTabChange = (event, newValue) => {
    onTabChange(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data} />;
      case 'analysis':
        return <AnalysisTab data={data} />;
      case 'features':
        return <FeaturesTab data={data} />;
      case 'processing':
        return (
          <ProcessingTab
            onThresholdApply={onThresholdApply}
            onExport={onExport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          '& .MuiTab-root': {
            color: 'grey.400',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        <Tab label="Overview" value="overview" />
        <Tab label="Analysis" value="analysis" />
        <Tab label="Features" value="features" />
        <Tab label="Processing" value="processing" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {renderTabContent()}
      </Box>
    </Box>
  );
};

export default AnalysisTabs;