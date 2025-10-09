import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import {
  Play,
  Pause,
  Square,
  Download,
  Upload,
  Image,
  Settings,
  Users,
  AlertCircle,
  Activity,
  Heart,
  Brain as BrainIcon
} from 'lucide-react';

import DataLoader from './components/DataLoader';
import PatientSelector from './components/PatientSelector';
import VisualizationControls from './components/VisualizationControls';
import PlaybackControls from './components/PlaybackControls';
import AIAnalysis from './components/AIAnalysis';
import SystemStatus from './components/SystemStatus';

const App = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [datasetType, setDatasetType] = useState('ECG');
  const [visualizationType, setVisualizationType] = useState('icu');
  const [overlayMode, setOverlayMode] = useState('overlay');
  const [playbackState, setPlaybackState] = useState({
    playing: false,
    speed: 1.0,
    chunkMs: 200,
    displayWindow: 8.0,
    positions: []
  });
  const [graphData, setGraphData] = useState({ data: [], layout: {} });
  const [aiResults, setAiResults] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);
  const wsRef = useRef(null);

  // insert spinner keyframes once
  useEffect(() => {
    try {
      const stylesheet = document.styleSheets[0];
      const rule = `@keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }`;
      // avoid duplicate insertion
      if (![...stylesheet.cssRules].some(r => r.cssText && r.cssText.includes('@keyframes spin'))) {
        stylesheet.insertRule(rule, stylesheet.cssRules.length);
      }
    } catch (e) {
      // ignore if stylesheet manipulation fails (e.g., CSP)
      // it's still fine — spinner will just lack animation.
      // console.warn('Could not insert keyframes:', e);
    }
  }, []);

  // Load system info on mount
  useEffect(() => {
    loadSystemInfo();
  }, []); // eslint-disable-line

  // Setup WebSocket connection on mount and clean up on unmount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
        wsRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Playback interval management
  useEffect(() => {
    // clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (playbackState.playing) {
      intervalRef.current = setInterval(() => {
        updatePlayback();
      }, Math.max(50, playbackState.chunkMs)); // protect against too-small intervals
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playbackState.playing, playbackState.chunkMs]); // eslint-disable-line

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'playback_update') {
            setPlaybackState(prev => ({
              ...prev,
              positions: data.data.positions ?? prev.positions,
              playing: typeof data.data.playing === 'boolean' ? data.data.playing : prev.playing
            }));
          } else if (data.type === 'playback_state') {
            setPlaybackState(prev => ({ ...prev, ...data.data }));
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected — reconnecting in 5s');
        wsRef.current = null;
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system/info');
      setSystemInfo(response.data);
    } catch (err) {
      console.error('Error loading system info:', err);
      // don't set a fatal error here; system info is optional
    }
  };

  const handleLoadData = async (type, directory) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/load-data', {
        dataset_type: type,
        data_dir: directory
      });

      const patientsRes = response.data.patients || [];
      setPatients(patientsRes);
      setDatasetType(type);

      if (patientsRes.length > 0) {
        setSelectedPatients([0]);
        const firstPatientChannels = patientsRes[0].channels || [];
        setSelectedChannels(firstPatientChannels.slice(0, 3));

        setPlaybackState(prev => ({
          ...prev,
          positions: new Array(patientsRes.length).fill(0)
        }));
      }

      await loadSystemInfo();
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err.message || 'Unknown error';
      setError(`Failed to load data: ${errorMessage}`);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePlayback = async () => {
    if (!selectedPatients.length || !playbackState.playing) return;

    try {
      // notify server to advance playback (server-side)
      await axios.post('/api/playback/update');

      // fetch updated visualization data
      const response = await axios.post('/api/visualization/data', {
        patient_ids: selectedPatients,
        channels: selectedChannels,
        visualization_type: visualizationType,
        overlay_mode: overlayMode
      });

      const respData = response.data;
      if (respData?.success && Array.isArray(respData.data) && respData.data.length > 0) {
        const allTraces = respData.data.flatMap(patientData => patientData.traces || []);
        setGraphData({
          data: allTraces,
          layout: respData.data[0]?.layout || {
            title: 'Medical Signal Visualization',
            template: 'plotly_dark'
          }
        });
      }
    } catch (err) {
      console.error('Error updating playback:', err);
      if (err?.response?.status === 400) {
        setPlaybackState(prev => ({ ...prev, playing: false }));
      }
    }
  };

  const handlePlaybackControl = async (action) => {
    try {
      const response = await axios.post('/api/playback/control', {
        action,
        speed: playbackState.speed,
        chunk_ms: playbackState.chunkMs,
        display_window: playbackState.displayWindow
      });

      if (response.data?.playback_state) {
        setPlaybackState(prev => ({ ...prev, ...response.data.playback_state }));
      } else {
        setPlaybackState(prev => ({ ...prev, ...(response.data || {}) }));
      }

      if (action === 'play') {
        // call updatePlayback once shortly after starting
        setTimeout(() => {
          updatePlayback();
        }, 100);
      }
    } catch (err) {
      console.error('Playback control error:', err);
      const errorMessage = err?.response?.data?.detail || err.message || 'Unknown error';
      setError(`Playback control failed: ${errorMessage}`);
    }
  };

  const handleAIAnalysis = async (analysisType) => {
    if (!selectedPatients.length) {
      setError('Please select a patient first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const currentPosition = playbackState.positions?.[selectedPatients[0]] || 0;
      const response = await axios.post('/api/ai/analyze', {
        patient_id: selectedPatients[0],
        analysis_type: analysisType,
        signal_type: datasetType,
        current_position: currentPosition
      });

      setAiResults(response.data);
    } catch (err) {
      const errorMessage = err?.response?.data?.detail || err.message || 'Unknown error';
      setError(`AI Analysis failed: ${errorMessage}`);
      console.error('AI Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaybackStateChange = (newState) => {
    setPlaybackState(prev => ({ ...prev, ...newState }));
  };

  return (
    <div className="app" style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <Activity size={32} style={styles.titleIcon} />
            <h1 style={styles.title}>Enhanced ECG/EEG Real-time Monitor with AI Analysis</h1>
          </div>
          <SystemStatus systemInfo={systemInfo} />
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={styles.errorClose} aria-label="Close error">
            ×
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner} />
          <span>Processing...</span>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.content}>
        {/* Left Sidebar - Controls */}
        <aside style={styles.sidebar}>
          <DataLoader onLoadData={handleLoadData} datasetType={datasetType} loading={loading} />

          <PatientSelector
            patients={patients}
            selectedPatients={selectedPatients}
            selectedChannels={selectedChannels}
            onPatientsChange={setSelectedPatients}
            onChannelsChange={setSelectedChannels}
          />

          <VisualizationControls
            visualizationType={visualizationType}
            overlayMode={overlayMode}
            onVisualizationChange={setVisualizationType}
            onOverlayModeChange={setOverlayMode}
          />

          <PlaybackControls
            playbackState={playbackState}
            onPlaybackStateChange={handlePlaybackStateChange}
            onPlaybackControl={handlePlaybackControl}
            disabled={patients.length === 0}
          />

          <AIAnalysis
            onAnalyze={handleAIAnalysis}
            results={aiResults}
            disabled={patients.length === 0 || selectedPatients.length === 0}
          />
        </aside>

        {/* Main Visualization Area */}
        <main style={styles.visualization}>
          <section style={styles.graphContainer}>
            <div style={styles.graphHeader}>
              <h2 style={styles.graphTitle}>
                {datasetType === 'ECG' ? <Heart size={20} /> : <BrainIcon size={20} />}
                <span style={{ marginLeft: 6 }}>{datasetType} Signal Visualization - {visualizationType.toUpperCase()}</span>
              </h2>

              <div style={styles.graphStats}>
                {selectedPatients.length > 0 && typeof playbackState.positions?.[selectedPatients[0]] !== 'undefined' && (
                  <>
                    <span>Position: {playbackState.positions[selectedPatients[0]]}</span>
                    <span>Playing: {playbackState.playing ? 'Yes' : 'No'}</span>
                  </>
                )}
              </div>
            </div>

            <Plot
              data={graphData.data}
              layout={{
                ...graphData.layout,
                template: graphData.layout?.template || 'plotly_dark',
                height: 500,
                margin: { t: 50, l: 50, r: 50, b: 50 }
              }}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                toImageButtonOptions: {
                  format: 'png',
                  filename: `${datasetType}_visualization`,
                  height: 600,
                  width: 800,
                  scale: 2
                }
              }}
              style={styles.plot}
              useResizeHandler={true}
            />
          </section>

          <section style={styles.extraGraphContainer}>
            <div style={styles.graphHeader}>
              <h3 style={styles.graphTitle}>Additional Analysis</h3>
            </div>

            <Plot
              data={[]}
              layout={{
                title: 'Feature analysis will be displayed here',
                template: 'plotly_dark',
                height: 280,
                margin: { t: 50, l: 50, r: 50, b: 50 }
              }}
              style={styles.plot}
              config={{ displayModeBar: false }}
            />
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <span>Medical ECG/EEG Analysis System</span>
          <span>•</span>
          <span>Real-time Monitoring</span>
          <span>•</span>
          <span>AI-Powered Diagnostics</span>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  app: {
    backgroundColor: '#222',
    color: '#fff',
    minHeight: '100vh',
    padding: '12px',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: '#000',
    padding: '8px',
    marginBottom: '8px',
    borderRadius: '6px'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  titleIcon: {
    color: '#00ff41'
  },
  title: {
    color: '#00ff41',
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
  },
  error: {
    backgroundColor: '#330000',
    color: '#ff6347',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #ff6347'
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#ff6347',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: 'auto'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    gap: '16px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTop: '4px solid #00ff41',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  content: {
    display: 'flex',
    gap: '12px',
    flex: 1,
    minHeight: 0
  },
  sidebar: {
    width: '350px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto'
  },
  visualization: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: 0
  },
  graphContainer: {
    backgroundColor: '#111',
    borderRadius: '6px',
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },
  graphHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    padding: '0 8px'
  },
  graphTitle: {
    color: '#00ff41',
    margin: 0,
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  graphStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#ccc'
  },
  extraGraphContainer: {
    backgroundColor: '#111',
    borderRadius: '6px',
    padding: '12px',
    height: '320px',
    display: 'flex',
    flexDirection: 'column'
  },
  plot: {
    width: '100%',
    height: '100%',
    flex: 1,
    minHeight: 0
  },
  footer: {
    backgroundColor: '#000',
    padding: '8px',
    marginTop: '12px',
    borderRadius: '6px'
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    color: '#666',
    fontSize: '12px'
  }
};

export default App;
