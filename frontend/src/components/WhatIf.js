import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

function SliderInput({ label, value, onChange, min, max, step, unit, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#8ab4cc' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: color || '#00d4ff' }}>
          {value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color || '#00d4ff', cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#1e3a5f' }}>{min}{unit}</span>
        <span style={{ fontSize: 10, color: '#1e3a5f' }}>{max}{unit}</span>
      </div>
    </div>
  );
}

function ResultCard({ label, original, modified, unit, icon }) {
  const improved = modified < original;
  const diff = Math.abs(original - modified).toFixed(1);
  return (
    <div style={{
      background: '#0a1628', border: '1px solid #1e3a5f',
      borderRadius: 10, padding: '12px 16px', marginBottom: 8
    }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 2 }}>CURRENT</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ff4466' }}>{original}{unit}</div>
        </div>
        <div style={{ fontSize: 20, color: improved ? '#00ff88' : '#ff4466' }}>
          {improved ? '↓' : '↑'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 2 }}>AFTER CHANGE</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: improved ? '#00ff88' : '#ff4466' }}>
            {modified}{unit}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 2 }}>CHANGE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: improved ? '#00ff88' : '#ff4466' }}>
            {improved ? '-' : '+'}{diff}{unit}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatIf() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [base, setBase] = useState({
    visit_hour: 14, day_type: 0, triage_level: 2,
    doctor_load: 34, staff_to_patient_ratio: 0.3,
    resource_utilization_rate: 74, bed_occupancy: 75,
    num_transfers: 2, num_process_steps: 5, loop_count: 1,
    rework_count: 1, repeated_tests: 0, data_error_count: 0,
    system_downtime_impact: 0, discharge_bottleneck_index: 29,
    wait_time_min: 87, tat_min: 66, bed_delay_min: 59,
    admission_delay_min: 20
  });

  const [extraDoctors, setExtraDoctors] = useState(0);
  const [bedReduction, setBedReduction] = useState(0);
  const [extraStaff, setExtraStaff] = useState(0);
  const [transferReduction, setTransferReduction] = useState(0);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const modified = {
        ...base,
        doctor_load: Math.max(1, base.doctor_load - extraDoctors * 3),
        bed_occupancy: Math.max(0, base.bed_occupancy - bedReduction),
        staff_to_patient_ratio: Math.min(1, base.staff_to_patient_ratio + extraStaff * 0.05),
        num_transfers: Math.max(0, base.num_transfers - transferReduction),
      };
      const res = await axios.post(`${BASE_URL}/api/whatif`, {
        original: base, modified
      });
      setResult(res.data);
    } catch (err) {
      setError('Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>
          DECISION SUPPORT SYSTEM
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
          🎛️ What-If Simulator
        </div>
        <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
          Simulate interventions and see predicted impact using AI models
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        {/* LEFT — Intervention Sliders */}
        <div style={{
          flex: '0 0 320px', background: '#060d1a',
          border: '1px solid #1e3a5f', borderRadius: 16, padding: 24
        }}>
          <div style={{ fontSize: 12, color: '#4a7fa5', letterSpacing: 1, marginBottom: 20 }}>
            INTERVENTION CONTROLS
          </div>

          <SliderInput label="Additional Doctors" value={extraDoctors}
            onChange={setExtraDoctors} min={0} max={10} unit=" doctors" color="#00d4ff" />
          <SliderInput label="Reduce Bed Occupancy" value={bedReduction}
            onChange={setBedReduction} min={0} max={30} unit="%" color="#00ff88" />
          <SliderInput label="Additional Staff" value={extraStaff}
            onChange={setExtraStaff} min={0} max={10} unit=" staff" color="#ffd700" />
          <SliderInput label="Reduce Transfers" value={transferReduction}
            onChange={setTransferReduction} min={0} max={5} unit=" transfers" color="#a855f7" />

          {/* Summary of changes */}
          <div style={{
            background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: 10, padding: 16, marginBottom: 20
          }}>
            <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 10 }}>INTERVENTION SUMMARY</div>
            {[
              { label: 'Doctor Load', before: base.doctor_load, after: Math.max(1, base.doctor_load - extraDoctors * 3), unit: '' },
              { label: 'Bed Occupancy', before: base.bed_occupancy, after: Math.max(0, base.bed_occupancy - bedReduction), unit: '%' },
              { label: 'Transfers', before: base.num_transfers, after: Math.max(0, base.num_transfers - transferReduction), unit: '' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#8ab4cc' }}>{item.label}</span>
                <span style={{ fontSize: 12 }}>
                  <span style={{ color: '#ff4466' }}>{item.before}{item.unit}</span>
                  <span style={{ color: '#4a7fa5' }}> → </span>
                  <span style={{ color: '#00ff88' }}>{item.after}{item.unit}</span>
                </span>
              </div>
            ))}
          </div>

          <button onClick={handleSimulate} disabled={loading} style={{
            width: '100%', background: loading ? '#1e3a5f' : 'linear-gradient(135deg, #0066ff, #0044aa)',
            border: 'none', borderRadius: 10, padding: 14,
            color: 'white', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer'
          }}>
            {loading ? '⏳ Running Models...' : '🚀 Simulate Intervention'}
          </button>

          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#1a0000',
              border: '1px solid #ff2244', borderRadius: 8, fontSize: 12, color: '#ff6680' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* RIGHT — Results */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {!result && !loading && (
            <div style={{
              background: '#060d1a', border: '1px solid #1e3a5f',
              borderRadius: 16, padding: 60, textAlign: 'center', color: '#1e3a5f'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎛️</div>
              <div style={{ fontSize: 16 }}>Adjust sliders and click</div>
              <div style={{ fontSize: 16, color: '#4a7fa5' }}>Simulate Intervention</div>
            </div>
          )}

          {loading && (
            <div style={{
              background: '#060d1a', border: '1px solid #1e3a5f',
              borderRadius: 16, padding: 60, textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <div style={{ fontSize: 16, color: '#00d4ff' }}>Running AI Models...</div>
            </div>
          )}

          {result && (
            <div>
              {/* Impact Summary */}
              <div style={{
                background: result.debt_reduction > 0 ? '#001a0d' : '#1a0000',
                border: `2px solid ${result.debt_reduction > 0 ? '#00ff88' : '#ff2244'}`,
                borderRadius: 16, padding: 24, marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#4a7fa5', marginBottom: 4 }}>
                      DEBT REDUCTION
                    </div>
                    <div style={{ fontSize: 48, fontWeight: 900,
  color: result.debt_reduction > 0 ? '#00ff88' : '#ff2244' }}>
  {result.pct_improvement}%
</div>
<div style={{ fontSize: 14, color: '#4a7fa5' }}>
  improvement in debt score
</div>
                  </div>
                </div>
              </div>

              {/* Severity Change */}
              <div style={{
                display: 'flex', gap: 12, marginBottom: 16
              }}>
                <div style={{
                  flex: 1, background: '#060d1a', border: '1px solid #ff224440',
                  borderRadius: 12, padding: 16, textAlign: 'center'
                }}>
                  <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 4 }}>CURRENT STATE</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#ff4466' }}>
                    {result.original.debt_score}
                  </div>
                  <div style={{ fontSize: 12, color: '#ff4466' }}>{result.original.severity}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, color: '#00ff88' }}>→</div>
                <div style={{
                  flex: 1, background: '#060d1a', border: '1px solid #00ff8840',
                  borderRadius: 12, padding: 16, textAlign: 'center'
                }}>
                  <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 4 }}>AFTER INTERVENTION</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#00ff88' }}>
                    {result.modified.debt_score}
                  </div>
                  <div style={{ fontSize: 12, color: '#00ff88' }}>{result.modified.severity}</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div style={{
                background: '#060d1a', border: '1px solid #1e3a5f',
                borderRadius: 16, padding: 20, marginBottom: 16
              }}>
                <div style={{ fontSize: 12, color: '#4a7fa5', letterSpacing: 1, marginBottom: 16 }}>
                  DETAILED IMPACT
                </div>
                <ResultCard label="Admission Delay" icon="🏥"
                  original={result.original.admission_delay}
                  modified={result.modified.admission_delay} unit=" min" />
                <ResultCard label="Discharge Delay" icon="🚪"
                  original={result.original.discharge_delay}
                  modified={result.modified.discharge_delay} unit=" min" />
                <ResultCard label="Overall Risk" icon="⚠️"
                  original={result.original.overall_risk}
                  modified={result.modified.overall_risk} unit="%" />
                
              </div>

              {/* Disclaimer */}
              <div style={{
                background: '#0a1628', border: '1px solid #ffd70030',
                borderRadius: 10, padding: 12
              }}>
                <div style={{ fontSize: 11, color: '#ffd700', marginBottom: 4 }}>⚠️ DISCLAIMER</div>
                <div style={{ fontSize: 11, color: '#4a7fa5', lineHeight: 1.6 }}>
                  {result.disclaimer}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
