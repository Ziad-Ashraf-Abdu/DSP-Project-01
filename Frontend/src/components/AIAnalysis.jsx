import React, { useState } from 'react';
import { Brain, Image, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const AIAnalysis = ({ onAnalyze, results, disabled }) => {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async (analysisType) => {
    setAnalyzing(true);
    try {
      await onAnalyze(analysisType);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatResults = (result) => {
    if (!result) return null;

    if (result.analysis_type === '1d') {
      const predictions = result.result.predictions || [];
      return (
        <div style={styles.results}>
          <div style={styles.resultHeader}>
            <h4 style={styles.resultTitle}>1D Signal Analysis Results</h4>
            <div style={styles.resultMeta}>
              <span>Model: {result.result.model_type || 'N/A'}</span>
              <span>Type: {result.signal_type}</span>
            </div>
          </div>
          
          {predictions.length > 0 ? (
            <div style={styles.predictions}>
              {predictions.map((pred, index) => {
                const confidence = pred.confidence || 0;
                const confidencePercent = Math.round(confidence * 100);
                let confidenceColor = '#ff6347';
                if (confidence >= 0.8) confidenceColor = '#00ff41';
                else if (confidence >= 0.6) confidenceColor = '#ffd700';
                else if (confidence >= 0.4) confidenceColor = '#ff8c00';

                return (
                  <div key={index} style={styles.prediction}>
                    <div style={styles.predictionHeader}>
                      <span style={styles.predictionRank}>#{index + 1}</span>
                      <span style={styles.predictionLabel}>{pred.label}</span>
                      <span style={{ ...styles.predictionConfidence, color: confidenceColor }}>
                        {confidencePercent}%
                      </span>
                    </div>
                    <div style={styles.confidenceBar}>
                      <div 
                        style={{
                          ...styles.confidenceFill,
                          width: `${confidencePercent}%`,
                          backgroundColor: confidenceColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.noPredictions}>
              <AlertCircle size={16} />
              <span>No predictions available</span>
            </div>
          )}

          {result.result.error && (
            <div style={styles.error}>
              <XCircle size={14} />
              <span>Error: {result.result.error}</span>
            </div>
          )}
        </div>
      );
    } else {
      const predictions = result.result.predictions || [];
      return (
        <div style={styles.results}>
          <div style={styles.resultHeader}>
            <h4 style={styles.resultTitle}>2D Image Analysis Results</h4>
            <div style={styles.resultMeta}>
              <span>Model: Teachable Machine</span>
              <span>Type: {result.signal_type}</span>
            </div>
          </div>
          
          {result.result.requires_setup ? (
            <div style={styles.setupRequired}>
              <AlertCircle size={16} />
              <div>
                <strong>Setup Required</strong>
                <div style={styles.setupText}>
                  {result.result.note || 'Additional setup required for 2D analysis'}
                </div>
              </div>
            </div>
          ) : predictions.length > 0 ? (
            <div style={styles.predictions}>
              {predictions.map((pred, index) => {
                const confidence = pred.probability || 0;
                const confidencePercent = Math.round(confidence * 100);
                let confidenceColor = '#ff6347';
                if (confidence >= 0.8) confidenceColor = '#00ff41';
                else if (confidence >= 0.6) confidenceColor = '#ffd700';
                else if (confidence >= 0.4) confidenceColor = '#ff8c00';

                return (
                  <div key={index} style={styles.prediction}>
                    <div style={styles.predictionHeader}>
                      <span style={styles.predictionRank}>#{index + 1}</span>
                      <span style={styles.predictionLabel}>{pred.class}</span>
                      <span style={{ ...styles.predictionConfidence, color: confidenceColor }}>
                        {confidencePercent}%
                      </span>
                    </div>
                    <div style={styles.confidenceBar}>
                      <div 
                        style={{
                          ...styles.confidenceFill,
                          width: `${confidencePercent}%`,
                          backgroundColor: confidenceColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.noPredictions}>
              <AlertCircle size={16} />
              <span>No predictions available</span>
            </div>
          )}

          {result.result.error && (
            <div style={styles.error}>
              <XCircle size={14} />
              <span>Error: {result.result.error}</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <Brain size={16} />
        AI Analysis
      </h3>

      <div style={styles.buttonGroup}>
        <button 
          onClick={() => handleAnalyze('1d')}
          style={{
            ...styles.button,
            ...styles.primaryButton,
            ...(analyzing ? styles.buttonAnalyzing : {}),
            ...(disabled ? styles.buttonDisabled : {})
          }}
          disabled={disabled || analyzing}
          title="Analyze signal data directly"
        >
          {analyzing ? (
            <div style={styles.spinner}></div>
          ) : (
            <Brain size={16} />
          )}
          Run 1D AI Analysis
        </button>
        
        <button 
          onClick={() => handleAnalyze('2d')}
          style={{
            ...styles.button,
            ...styles.secondaryButton,
            ...(analyzing ? styles.buttonAnalyzing : {}),
            ...(disabled ? styles.buttonDisabled : {})
          }}
          disabled={disabled || analyzing}
          title="Analyze graph visualization"
        >
          {analyzing ? (
            <div style={styles.spinner}></div>
          ) : (
            <Image size={16} />
          )}
          Run 2D AI Analysis
        </button>
      </div>

      {analyzing && (
        <div style={styles.analyzingOverlay}>
          <div style={styles.analyzingSpinner}></div>
          <span>AI Analysis in progress...</span>
        </div>
      )}

      {results && (
        <div style={styles.resultsContainer}>
          {formatResults(results)}
          <div style={styles.timestamp}>
            <Clock size={12} />
            <span>Analysis completed: {new Date(results.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}

      {disabled && (
        <div style={styles.disabledMessage}>
          <AlertCircle size={14} />
          <span>Load data and select a patient to enable AI analysis</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#111',
    padding: '12px',
    borderRadius: '6px',
    position: 'relative'
  },
  title: {
    color: '#00ff41',
    margin: '0 0 12px 0',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px'
  },
  button: {
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  },
  primaryButton: {
    backgroundColor: '#007acc',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#00aa00',
    color: 'white'
  },
  buttonAnalyzing: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  buttonDisabled: {
    backgroundColor: '#555',
    color: '#999',
    cursor: 'not-allowed'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    gap: '8px',
    color: '#00ff41',
    fontSize: '14px'
  },
  analyzingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid transparent',
    borderTop: '3px solid #00ff41',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  resultsContainer: {
    backgroundColor: '#1a1a1a',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #333'
  },
  resultHeader: {
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #333'
  },
  resultTitle: {
    color: '#00ff41',
    margin: '0 0 4px 0',
    fontSize: '14px'
  },
  resultMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#888'
  },
  predictions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  prediction: {
    backgroundColor: '#222',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #333'
  },
  predictionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  predictionRank: {
    fontSize: '10px',
    color: '#888',
    fontWeight: 'bold'
  },
  predictionLabel: {
    flex: 1,
    margin: '0 8px',
    fontSize: '13px',
    color: '#fff',
    fontWeight: '500'
  },
  predictionConfidence: {
    fontSize: '12px',
    fontWeight: 'bold'
  },
  confidenceBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#333',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  confidenceFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 4px currentColor'
  },
  noPredictions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#332200',
    color: '#ffd700',
    borderRadius: '4px',
    fontSize: '12px'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#330000',
    color: '#ff6347',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '8px'
  },
  setupRequired: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#332200',
    color: '#ffd700',
    borderRadius: '4px',
    fontSize: '12px'
  },
  setupText: {
    fontSize: '11px',
    color: '#ccc',
    marginTop: '4px'
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    paddingTop: '8px',
    borderTop: '1px solid #333',
    fontSize: '10px',
    color: '#666'
  },
  disabledMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px',
    backgroundColor: '#332200',
    color: '#ffd700',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'center'
  }
};

export default AIAnalysis;