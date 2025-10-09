// frontend/src/components/Controls.js
import React from 'react';
import { Row, Col, Card, Form } from 'react-bootstrap';

const LabeledInput = ({ label, id, value, onChange, width = 80 }) => (
  <div className="labeled-input">
    <Form.Label className="input-label">{label}</Form.Label>
    <Form.Control
      type="number"
      id={id}
      value={value}
      onChange={(e) => onChange(id, parseFloat(e.target.value))}
      style={{ width: `${width}px` }}
      className="custom-input"
    />
  </div>
);

const Controls = ({ params, onParamChange }) => {
  return (
    <Row>
      <Col md={6}>
        <Card className="control-card">
          <Card.Body>
            <h3>🔊 Sound Source</h3>
            <Form>
              <Form.Group className="mb-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Moving"
                  name="source-type"
                  value="moving"
                  checked={params.source_type === 'moving'}
                  onChange={(e) => onParamChange('source_type', e.target.value)}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Static"
                  name="source-type"
                  value="static"
                  checked={params.source_type === 'static'}
                  onChange={(e) => onParamChange('source_type', e.target.value)}
                />
              </Form.Group>
              
              <LabeledInput
                label="Start X (m):"
                id="source_x0"
                value={params.source_x0}
                onChange={onParamChange}
              />
              <LabeledInput
                label="Start Y (m):"
                id="source_y0"
                value={params.source_y0}
                onChange={onParamChange}
              />
              
              {params.source_type === 'moving' && (
                <>
                  <LabeledInput
                    label="Speed (m/s):"
                    id="source_speed"
                    value={params.source_speed}
                    onChange={onParamChange}
                  />
                  <LabeledInput
                    label="Direction (°):"
                    id="source_dir"
                    value={params.source_dir}
                    onChange={onParamChange}
                  />
                </>
              )}
            </Form>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6}>
        <Card className="control-card">
          <Card.Body>
            <h3>👂 Observer</h3>
            <Form>
              <Form.Group className="mb-3">
                <Form.Check
                  inline
                  type="radio"
                  label="Moving"
                  name="observer-type"
                  value="moving"
                  checked={params.observer_type === 'moving'}
                  onChange={(e) => onParamChange('observer_type', e.target.value)}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Static"
                  name="observer-type"
                  value="static"
                  checked={params.observer_type === 'static'}
                  onChange={(e) => onParamChange('observer_type', e.target.value)}
                />
              </Form.Group>
              
              <LabeledInput
                label="Start X (m):"
                id="observer_x0"
                value={params.observer_x0}
                onChange={onParamChange}
              />
              <LabeledInput
                label="Start Y (m):"
                id="observer_y0"
                value={params.observer_y0}
                onChange={onParamChange}
              />
              
              {params.observer_type === 'moving' && (
                <>
                  <LabeledInput
                    label="Speed (m/s):"
                    id="observer_speed"
                    value={params.observer_speed}
                    onChange={onParamChange}
                  />
                  <LabeledInput
                    label="Direction (°):"
                    id="observer_dir"
                    value={params.observer_dir}
                    onChange={onParamChange}
                  />
                </>
              )}
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default Controls;