// src/components/AudioAnalysis.js
import React from 'react';
import { Card, Button, Row, Col } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const AudioAnalysis = ({ data, audioFile, onUseFrequency }) => {
    const chartData = data.spectrum_data.xf ? data.spectrum_data.xf.map((xf, index) => ({
        x: xf,
        y: data.spectrum_data.magnitude[index]
    })).filter(point => point.x <= 2000) : [];

    return (
        <Card className="audio-analysis-card">
            <Card.Body>
                <Row>
                    <Col md={4}>
                        <h3>🎵 Audio Frequency Analysis</h3>
                        <p>Analyzed car sound file: {audioFile}</p>
                        <h4 className="dominant-frequency">
                            Detected Frequency: {data.dominant_freq.toFixed(1)} Hz
                        </h4>
                        <Button
                            variant="primary"
                            onClick={onUseFrequency}
                            className="use-frequency-btn"
                        >
                            📊 Use This Frequency
                        </Button>
                    </Col>
                    <Col md={8}>
                        <div className="spectrum-chart">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="x"
                                        label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5 }}
                                        domain={[0, 2000]}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value) => [`${value.toFixed(6)}`, 'Magnitude']}
                                        labelFormatter={(label) => `Frequency: ${label.toFixed(1)} Hz`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="y"
                                        stroke="#667eea"
                                        strokeWidth={2}
                                        dot={false}
                                        fill="url(#colorGradient)"
                                    />
                                    {data.dominant_freq > 0 && (
                                        <ReferenceLine
                                            x={data.dominant_freq}
                                            stroke="#f093fb"
                                            strokeDasharray="5,5"
                                            strokeWidth={2}
                                            label={`Dominant: ${data.dominant_freq.toFixed(1)} Hz`}
                                        />
                                    )}
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#667eea" stopOpacity={0.8}/>
                                            <stop offset="100%" stopColor="#667eea" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default AudioAnalysis;