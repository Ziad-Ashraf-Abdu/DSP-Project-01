// src/components/SimulationGraph.js
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SimulationGraph = ({ simulationData, params, timeElapsed }) => {
    const data = [
        { x: simulationData.obs_x, y: simulationData.obs_y, type: 'observer' },
        { x: simulationData.src_x, y: simulationData.src_y, type: 'source' }
    ];

    const carRotation = params.source_type === 'moving' ? params.source_dir : 0;

    // Custom shape for wave circles
    const WaveShape = (props) => {
        const { cx, cy, payload } = props;
        if (!payload || !payload.radius) return null;

        return (
            <circle
                cx={cx}
                cy={cy}
                r={payload.radius}
                fill="none"
                stroke={`rgba(102, 126, 234, ${payload.opacity || 0.3})`}
                strokeDasharray="5,5"
                strokeWidth={2}
            />
        );
    };

    // Custom shape for observer
    const ObserverShape = (props) => {
        const { cx, cy } = props;
        return (
            <g>
                <circle cx={cx} cy={cy} r={10} fill="#f093fb" stroke="white" strokeWidth={2} />
                <text
                    x={cx}
                    y={cy - 15}
                    textAnchor="middle"
                    fill="#2d3748"
                    fontSize={12}
                    fontWeight="bold"
                >
                    👂 Observer
                </text>
            </g>
        );
    };

    // Custom shape for car source
    const CarShape = (props) => {
        const { cx, cy } = props;
        return (
            <g transform={`translate(${cx},${cy}) rotate(${carRotation})`}>
                {/* Car body */}
                <rect x={-20} y={-12.5} width={40} height={25} rx={5} fill="#667eea" stroke="white" strokeWidth={2} />
                {/* Car top */}
                <path d="M -20 -12.5 L -15 -25 L 15 -25 L 20 -12.5 Z" fill="#667eea" stroke="white" strokeWidth={2} />
                {/* Windows */}
                <rect x={-14} y={-22} width={12} height={10} rx={2} fill="#E3F2FD" />
                <rect x={2} y={-22} width={12} height={10} rx={2} fill="#E3F2FD" />
                {/* Wheels */}
                <circle cx={-12} cy={15} r={6} fill="#2c3e50" stroke="white" strokeWidth={1.5} />
                <circle cx={12} cy={15} r={6} fill="#2c3e50" stroke="white" strokeWidth={1.5} />
            </g>
        );
    };

    // Prepare wave data for scatter plot
    const waveData = simulationData.waves.map(wave => ({
        x: wave.cx,
        y: wave.cy,
        radius: wave.radius,
        opacity: wave.opacity
    }));

    return (
        <div className="simulation-graph">
            <ResponsiveContainer width="100%" height={500}>
                <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        name="X Position"
                        domain={[-300, 300]}
                        label={{ value: 'X Position (meters)', position: 'insideBottom', offset: -5 }}
                        tick={{ fill: '#4a5568' }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name="Y Position"
                        domain={[-150, 150]}
                        label={{ value: 'Y Position (meters)', angle: -90, position: 'insideLeft' }}
                        tick={{ fill: '#4a5568' }}
                    />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value, name) => [value.toFixed(1), name]}
                        labelFormatter={(label) => `Position: ${label}`}
                    />

                    {/* Wave circles */}
                    <Scatter
                        data={waveData}
                        fill="none"
                        shape={WaveShape}
                    />

                    {/* Observer */}
                    <Scatter
                        data={data.filter(d => d.type === 'observer')}
                        fill="#f093fb"
                        shape={ObserverShape}
                    />

                    {/* Source (Car) */}
                    <Scatter
                        data={data.filter(d => d.type === 'source')}
                        fill="none"
                        shape={CarShape}
                    />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SimulationGraph;