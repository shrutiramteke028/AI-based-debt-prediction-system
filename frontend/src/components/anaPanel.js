import React, { useState } from 'react';
import api from '../utils/api';

const SEVERITY_COLORS = {
  HEALTHY:  '#00ff88',
  MODERATE: '#ffd700',
  HIGH:     '#ff8800',
  CRITICAL: '#ff2244',
};

// Real averages from your dataset
const DATASET_DEFAULTS = {
  visit_hour: 12,
  day_type: 1,
  triage_level: 2,
  doctor_load: 34,
  staff_to_patient_ratio: 0.28,
  resource_utilization_rate: 74,
  bed_occupancy: 75,
  num_transfers: 2,
  num_process_steps: 6,
  loop_count: 1,
  rework_count: 1,
  repeated_tests: 0,
  data_error_count: 0,
  system_downtime_impact: 0,
  discharge_bottleneck_index: 29,
  wait_time_min: 87,
  tat_min: 66,
  bed_delay_min: 59,
  admission_delay_min: 29,
  department: 'OPD',
};

// Presets based on dataset percentiles
const PRESETS = {
  normal: {
    doctor_load: 15, bed_occupancy: 45,
    rework_count: 0, num_transfers: 1,
    wait_time_min: 30, tat_min: 30,
    bed_delay_min: 15, discharge_bottleneck_index: 10,
    resource_utilization_rate: 40, loop_count: 0,
  },
  moderate: {
    doctor_load: 34, bed_occupancy: 75,
    rework_count: 1, num_transfers: 2,
    wait_time_min: 87, tat_min: 66,
    bed_delay_min: 59, discharge_bottleneck_index: 29,
    resource_utilization_rate: 74, loop_count: 1,
  },
  critical: {
    doctor_load: 60, bed_occupancy: 95,
    rework_count: 5, num_transfers: 6,
    wait_time_min: 180, tat_min: 150,
    bed_delay_min: 120, discharge_bottleneck_index: 60,
    resource_utilization_rate: 95, loop_count: 4,
  },
};

function InputField({ label, value, onChange, min, max, unit }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 5, letterSpacing: 1 }}>
        {label} {unit && <span style={{ color: '#1e3a5f' }}>({unit})</span>}
      </div>
      <input type="number" value={value} min={min} max={max}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', background: '#060d1a',
          border: '1px solid #1e3a5f', borderRadius: 8,
          padding: '9px 12px', color: '#ffffff',
          fontSize: 14, fontWeight: 600, outline: 'none',
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', marginBottom: 5, letterSpacing: 1 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', background: '#060d1a',
          border: '1px solid #1e3a5f', borderRadius: 8,
          padding: '9px 12px', color: '#ffffff',
          fontSize: 14, outline: 'none',
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PredictionCard({ title, value, unit, risk, icon }) {
  const color = risk === 'HIGH' ? '#ff2244' : risk === 'MODERATE' ? '#ffd700' : '#00ff88';
  return (
    <div style={{
      background: '#060d1a', border: `1px solid ${color}30`,
      borderRadius: 12, padding: 14, flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>
        {value}<span style={{ fontSize: 11, color: '#4a7fa5', marginLeft: 3 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10, color, marginTop: 3 }}>{risk}</div>
    </div>
  );
}

function DebtGauge({ score, severity, confidence }) {
  const color = SEVERITY_COLORS[severity] || '#ffd700';
  const pct = Math.min(100, score);
  const confColor = confidence >= 85 ? '#00ff88' : confidence >= 70 ? '#ffd700' : '#ff8800';

  return (
    <div style={{
      background: '#060d1a',
      border: `2px solid ${color}`,
      borderRadius: 16,
      padding: 24,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 12 }}>
        PROCESS DEBT SCORE
      </div>
      <div style={{ fontSize: 64, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: 14, color, marginTop: 4, fontWeight: 700 }}>{severity}</div>
      <div style={{ background: '#0a1628', borderRadius: 4, height: 8, marginTop: 16 }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          borderRadius: 4, boxShadow: `0 0 10px ${color}`,
          transition: 'width 0.8s ease'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: '#1e3a5f' }}>0</span>
        <span style={{ fontSize: 10, color: '#1e3a5f' }}>100</span>
      </div>
      <div style={{
        marginTop: 16, padding: '10px 14px',
        background: '#0a1628',
        border: `1px solid ${confColor}40`,
        borderRadius: 10
      }}>
        <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 4, letterSpacing: 1 }}>
          MODEL CONFIDENCE
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: confColor }}>
          {confidence}%
        </div>
        <div style={{ background: '#060d1a', borderRadius: 4, height: 4, marginTop: 6 }}>
          <div style={{
            width: `${confidence}%`, height: '100%',
            background: confColor, borderRadius: 4,
            boxShadow: `0 0 6px ${confColor}`
          }} />
        </div>
        <div style={{ fontSize: 10, color: '#4a7fa5', marginTop: 4 }}>
          {confidence >= 85 ? 'High confidence — reliable prediction' :
           confidence >= 70 ? 'Moderate confidence — use with judgment' :
           'Lower confidence — inputs near model boundary'}
        </div>
      </div>
    </div>
  );
}
function PrescriptionCard({ result }) {
  const { recommendations, cascade, department, debt_score, severity } = result;
  const color = SEVERITY_COLORS[severity] || '#ffd700';
  return (
    <div style={{
      background: '#060d1a', border: `2px solid ${color}`,
      borderRadius: 16, padding: 24, marginTop: 20,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
        paddingBottom: 16, borderBottom: '1px solid #1e3a5f'
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>
            📋 PROCESS DEBT PRESCRIPTION
          </div>
          <div style={{ fontSize: 11, color: '#4a7fa5', marginTop: 4 }}>
            Dept: {department} · Score: {debt_score} · {new Date().toLocaleTimeString()}
          </div>
        </div>
        <div style={{
          background: `${color}20`, border: `1px solid ${color}`,
          borderRadius: 8, padding: '6px 14px',
          fontSize: 13, color, fontWeight: 700
        }}>{severity}</div>
      </div>

      {/* Cascade Diagnosis */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 10 }}>
          ROOT CAUSE CASCADE
        </div>
        {cascade.chain.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {cascade.chain.map((c, i) => (
              <React.Fragment key={i}>
                <div style={{
                  background: '#0a1628', border: '1px solid #1e3a5f',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ fontSize: 12, color: '#ff8800', fontWeight: 700 }}>{c.stage}</div>
                  <div style={{ fontSize: 10, color: '#4a7fa5' }}>+{c.delay} min</div>
                </div>
                {i < cascade.chain.length - 1 && (
                  <span style={{ color: '#ff2244', fontSize: 16 }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div style={{ color: '#00ff88', fontSize: 13 }}>✅ No cascade bottlenecks detected</div>
        )}
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 10 }}>
          PRESCRIBED ACTIONS
        </div>
        {recommendations.map((rec, i) => (
          <div key={i} style={{
            background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: 10, padding: '12px 16px', marginBottom: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: rec.urgency === 'NOW' ? '#ff2244' :
                              rec.urgency === 'URGENT' ? '#ff8800' :
                              rec.urgency === 'HIGH' ? '#ffd700' : '#1e3a5f',
                  borderRadius: 4, padding: '2px 8px',
                  fontSize: 10, fontWeight: 700, color: 'white'
                }}>Rx{rec.priority} · {rec.urgency}</span>
              </div>
              <div style={{ fontSize: 13, color: '#ffffff' }}>{rec.action}</div>
             
              
            </div>
            <div style={{ textAlign: 'right', marginLeft: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#00ff88' }}>-{rec.impact_pct}%</div>
              <div style={{ fontSize: 10, color: '#4a7fa5' }}>debt reduction</div>
            </div>
          </div>
        ))}
      </div>

      {/* Before vs After */}
      <div>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 10 }}>
          BEFORE vs AFTER AI INTERVENTION
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            flex: 1, background: '#1a0000',
            border: '1px solid #ff224440', borderRadius: 12, padding: 16
          }}>
            <div style={{ fontSize: 12, color: '#ff2244', marginBottom: 12, fontWeight: 700 }}>❌ WITHOUT AI</div>
            {[
              ['Debt Score', result.before_after.before.debt_score],
              ['Admission Delay', `${result.before_after.before.admission_delay} min`],
              ['Discharge Delay', `${result.before_after.before.discharge_delay} min`],
              ['Rework Risk', `${result.before_after.before.rework_risk}%`],
              ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#4a7fa5' }}>{k}</span>
                <span style={{ fontSize: 12, color: '#ff6680', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, color: '#00ff88' }}>→</div>
          <div style={{
            flex: 1, background: '#001a0d',
            border: '1px solid #00ff8840', borderRadius: 12, padding: 16
          }}>
            <div style={{ fontSize: 12, color: '#00ff88', marginBottom: 12, fontWeight: 700 }}>✅ WITH AI</div>
            {[
              ['Debt Score', result.before_after.after.debt_score],
              ['Admission Delay', `${result.before_after.after.admission_delay} min`],
              ['Discharge Delay', `${result.before_after.after.discharge_delay} min`],
              ['Rework Risk', `${result.before_after.after.rework_risk}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#4a7fa5' }}>{k}</span>
                <span style={{ fontSize: 12, color: '#00ff88', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 20, paddingTop: 16, borderTop: '1px solid #1e3a5f',
        fontSize: 11, color: '#1e3a5f', textAlign: 'center'
      }}>
        Powered by HospitalDebt-AI 
      </div>
    </div>
  );
}

export default function AnalysisPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [inputs, setInputs] = useState(DATASET_DEFAULTS);

  const set = (key) => (val) => setInputs(prev => ({ ...prev, [key]: val }));

  const handlePreset = (preset) => {
    setInputs(prev => ({ ...prev, ...PRESETS[preset] }));
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.predict(inputs);
      setResult(data);
    } catch (err) {
      setError('Cannot connect to backend. Make sure Flask is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>AI ANALYSIS ENGINE</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>🔍 Process Debt Predictor</div>
        <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
          Default values loaded from dataset averages (5000 hospital records)
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* INPUT PANEL */}
        <div style={{
          flex: '0 0 300px', background: '#060d1a',
          border: '1px solid #1e3a5f', borderRadius: 16, padding: 20,
        }}>
          <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 14 }}>
            HOSPITAL PARAMETERS
          </div>
          <div style={{ fontSize: 10, color: '#1e3a5f', marginBottom: 14 }}>
            Defaults = real averages from your synthetic dataset
          </div>

          {/* Presets */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 6 }}>QUICK PRESETS</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: '🟢 Normal', key: 'normal' },
                { label: '🟡 Average', key: 'moderate' },
                { label: '🔴 Critical', key: 'critical' },
              ].map(p => (
                <button key={p.key} onClick={() => handlePreset(p.key)} style={{
                  flex: 1, background: '#0a1628', border: '1px solid #1e3a5f',
                  borderRadius: 6, padding: '6px 4px', color: '#8ab4cc',
                  fontSize: 11, cursor: 'pointer',
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          <SelectField label="DEPARTMENT" value={inputs.department}
            onChange={set('department')}
            options={['OPD','Lab','Ward','ICU','Pharmacy','Discharge'].map(d => ({ value: d, label: d }))}
          />
          <SelectField label="TRIAGE LEVEL" value={inputs.triage_level}
            onChange={v => set('triage_level')(Number(v))}
            options={[
              { value: 1, label: '1 — Critical' },
              { value: 2, label: '2 — Urgent' },
              { value: 3, label: '3 — Normal' },
            ]}
          />
          <SelectField label="DAY TYPE" value={inputs.day_type}
            onChange={v => set('day_type')(Number(v))}
            options={[{ value: 0, label: 'Weekday' }, { value: 1, label: 'Weekend' }]}
          />
          <InputField label="VISIT HOUR" value={inputs.visit_hour} onChange={set('visit_hour')} min={0} max={23} unit="0-23" />
          <InputField label="DOCTOR LOAD (avg from dataset: 34)" value={inputs.doctor_load} onChange={set('doctor_load')} min={1} max={100} unit="patients/doctor" />
          <InputField label="BED OCCUPANCY (avg: 75%)" value={inputs.bed_occupancy} onChange={set('bed_occupancy')} min={0} max={100} unit="%" />
          <InputField label="RESOURCE UTILIZATION (avg: 74%)" value={inputs.resource_utilization_rate} onChange={set('resource_utilization_rate')} min={0} max={100} unit="%" />
          <InputField label="NUM TRANSFERS (avg: 2)" value={inputs.num_transfers} onChange={set('num_transfers')} min={0} max={20} />
          <InputField label="REWORK COUNT (avg: 1)" value={inputs.rework_count} onChange={set('rework_count')} min={0} max={20} />
          <InputField label="WAIT TIME (avg: 87 min)" value={inputs.wait_time_min} onChange={set('wait_time_min')} min={0} max={500} unit="min" />
          <InputField label="LAB TAT (avg: 66 min)" value={inputs.tat_min} onChange={set('tat_min')} min={0} max={500} unit="min" />
          <InputField label="BED DELAY (avg: 59 min)" value={inputs.bed_delay_min} onChange={set('bed_delay_min')} min={0} max={500} unit="min" />
          <InputField label="DISCHARGE BOTTLENECK (avg: 29)" value={inputs.discharge_bottleneck_index} onChange={set('discharge_bottleneck_index')} min={0} max={100} />

          <button onClick={handleAnalyze} disabled={loading} style={{
            width: '100%',
            background: loading ? '#1e3a5f' : 'linear-gradient(135deg, #0066ff, #0044aa)',
            border: 'none', borderRadius: 10, padding: '14px',
            color: 'white', fontWeight: 700, fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
          }}>
            {loading ? '⏳ Running XGBoost Models...' : '🚀 Run AI Analysis'}
          </button>

          {error && (
            <div style={{
              marginTop: 12, padding: 12, background: '#1a0000',
              border: '1px solid #ff2244', borderRadius: 8,
              fontSize: 12, color: '#ff6680'
            }}>⚠️ {error}</div>
          )}
        </div>

        {/* RESULTS */}
        <div style={{ flex: 1, minWidth: 300 }}>
          {!result && !loading && (
            <div style={{
              background: '#060d1a', border: '1px solid #1e3a5f',
              borderRadius: 16, padding: 60, textAlign: 'center', color: '#1e3a5f'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 16 }}>Set parameters and click</div>
              <div style={{ fontSize: 16, color: '#4a7fa5', marginTop: 4 }}>Run AI Analysis</div>
              <div style={{ fontSize: 12, color: '#1e3a5f', marginTop: 8 }}>
                Defaults loaded from dataset averages
              </div>
            </div>
          )}

          {loading && (
            <div style={{
              background: '#060d1a', border: '1px solid #1e3a5f',
              borderRadius: 16, padding: 60, textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <div style={{ fontSize: 16, color: '#00d4ff' }}>Running 5 XGBoost Models...</div>
              <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 8 }}>
                Trained on your 5000-record synthetic dataset
              </div>
            </div>
          )}

          {result && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 170px' }}>
                  <DebtGauge
                   score={result.debt_score}
                   severity={result.severity}
                   confidence={result.predictions.confidence_score}
           />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <PredictionCard title="ADMISSION DELAY"
                      value={result.predictions.admission_delay_min} unit="min"
                      risk={result.predictions.admission_delay_min > 60 ? 'HIGH' :
                            result.predictions.admission_delay_min > 30 ? 'MODERATE' : 'LOW'}
                      icon="🏥" />
                    <PredictionCard title="DISCHARGE DELAY"
                      value={result.predictions.discharge_delay_min} unit="min"
                      risk={result.predictions.discharge_delay_min > 60 ? 'HIGH' :
                            result.predictions.discharge_delay_min > 30 ? 'MODERATE' : 'LOW'}
                      icon="🚪" />
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <PredictionCard title="REWORK RISK"
                      value={result.predictions.rework_probability} unit="%"
                      risk={result.predictions.rework_probability > 70 ? 'HIGH' :
                            result.predictions.rework_probability > 40 ? 'MODERATE' : 'LOW'}
                      icon="🔁" />
                    <PredictionCard title="TRANSFER RISK"
                      value={result.predictions.transfer_delay_probability} unit="%"
                      risk={result.predictions.transfer_delay_probability > 70 ? 'HIGH' :
                            result.predictions.transfer_delay_probability > 40 ? 'MODERATE' : 'LOW'}
                      icon="🔄" />
                    <PredictionCard title="OVERALL RISK"
                      value={result.predictions.overall_risk_probability} unit="%"
                      risk={result.predictions.overall_risk_probability > 70 ? 'HIGH' :
                            result.predictions.overall_risk_probability > 40 ? 'MODERATE' : 'LOW'}
                      icon="⚠️" />
                  </div>
                </div>
              </div>
              <PrescriptionCard result={result} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}