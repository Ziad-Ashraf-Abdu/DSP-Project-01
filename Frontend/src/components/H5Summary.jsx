// frontend/src/components/H5Summary.js
import React from 'react';
import { Card } from 'react-bootstrap';

const H5Summary = ({ stats, audioFile }) => {
    return (
        <Card className="h5-summary-card">
            <Card.Body>
                <p className="mb-1">
                    <strong>AUDIO_FILE full:</strong> {audioFile},
                    <strong> Speed estimates found:</strong> {stats.count || "N/A"}
                </p>
                <p className="mb-1">
                    <strong>Mode (most frequent):</strong> {stats.mode !== null ? `${stats.mode} m/s` : "N/A"}
                </p>
                <p className="mb-0">
                    <strong>Mean speed:</strong> {stats.mean !== null ? `${stats.mean.toFixed(3)} m/s` : "N/A"}
                </p>
                {stats.error && (
                    <p className="mb-0 text-danger">
                        <strong>Error:</strong> {stats.error}
                    </p>
                )}
            </Card.Body>
        </Card>
    );
};

export default H5Summary;