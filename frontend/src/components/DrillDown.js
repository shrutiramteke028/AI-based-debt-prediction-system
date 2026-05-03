import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import api from '../utils/api';


const SEVERITY_COLORS = {
  HEALTHY:  '#00ff88',
  MODERATE: '#ffd700',
  HIGH:     '#ff8800',
  CRITICAL: '#ff2244',
};

// ── SHAP CHART ──
function ShapChart({ dept }) {
  const [shapData, setShapData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShap = async () => {
      try {
        const res = await api.getShap({
          visit_hour: 14,
          day_type: 0,
          triage_level: dept.name === 'ICU' ? 1 : dept.name === 'OPD' ? 2 : 3,
          doctor_load: dept.patients_waiting,
          bed_occupancy: dept.debt_score,
          resource_utilization_rate: dept.debt_score + 10,
          staff_to_patient_ratio: 0.3,
          num_transfers: 2,
          num_process_steps: 5,
          loop_count: 1,
          rework_count: 1,
          repeated_tests: 0,
          data_error_count: 0,
          system_downtime_impact: 0,
          discharge_bottleneck_index: 15,
        });
        const data = res.shap_explanation
          .map(d => ({ feature: d.feature.replace(/_/g, ' '), value: Math.abs(d.value), raw: d.value }))
          .slice(0, 6);
        setShapData(data);
      } catch (err) {
        console.error('SHAP error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShap();
  }, [dept]);

  if (loading) return (
    <div style={{ color: '#4a7fa5', padding: 20, textAlign: 'center' }}>
      Loading SHAP explanation...
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 8 }}>
        WHY IS THIS DEPARTMENT AT THIS DEBT LEVEL?
      </div>
      <div style={{ fontSize: 12, color: '#8ab4cc', marginBottom: 16 }}>
        SHAP values show which factors contribute most to process debt in {dept.name}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={shapData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#0d1f35" />
          <XAxis type="number" tick={{ fill: '#4a7fa5', fontSize: 10 }} />
          <YAxis dataKey="feature" type="category"
            tick={{ fill: '#8ab4cc', fontSize: 10 }} width={140} />
          <Tooltip
            contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8 }}
            formatter={(val, name, props) => [
              `${props.payload.raw > 0 ? '+' : ''}${props.payload.raw.toFixed(4)}`,
              'SHAP Impact'
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {shapData.map((d, i) => (
              <Cell key={i} fill={d.raw > 0 ? '#ff8800' : '#00ff88'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a7fa5' }}>
          <div style={{ width: 10, height: 10, background: '#ff8800', borderRadius: 2 }} />
          Increases debt
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a7fa5' }}>
          <div style={{ width: 10, height: 10, background: '#00ff88', borderRadius: 2 }} />
          Decreases debt
        </div>
      </div>
    </div>
  );
}

// ── DEPT STATS ──
function DeptStats({ dept }) {
  const color = SEVERITY_COLORS[dept.severity] || '#ffd700';
  const stats = [
    { label: 'DEBT SCORE', value: dept.debt_score, unit: '/100', color },
    { label: 'PATIENTS WAITING', value: dept.patients_waiting, unit: '', color: '#00d4ff' },
    { label: 'AVG DELAY', value: dept.avg_delay_min, unit: ' min', color: '#ffd700' },
    { label: 'SEVERITY', value: dept.severity, unit: '', color },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 130,
          background: '#060d1a',
          border: `1px solid ${s.color}30`,
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ fontSize: 10, color: '#4a7fa5', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
            {s.value}{s.unit}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── QUICK RECOMMENDATIONS ──
function QuickRecs({ dept }) {
  const color = SEVERITY_COLORS[dept.severity] || '#ffd700';
  const recs = {
    OPD: [
      'Open additional consultation counter during 10AM-2PM peak hours',
      'Implement token-based queue management to reduce crowding',
      'Enable online appointment pre-screening to reduce walk-in load',
    ],
    Lab: [
      'Batch similar test types to optimize equipment utilization',
      'Add dedicated staff for sample collection during peak hours',
      'Implement auto-alert when TAT exceeds 60 minutes threshold',
    ],
    Ward: [
      'Pre-assign beds before patient arrives from OPD/Emergency',
      'Create dedicated discharge lounge to free beds faster',
      'Implement real-time bed tracking dashboard for nurses',
    ],
    ICU: [
      'Establish step-down protocol to move stable patients to general ward',
      'Pre-alert ICU team 2 hours before planned post-surgery transfers',
      'Monitor ventilator utilization to predict capacity crunches',
    ],
    Pharmacy: [
      'Pre-process discharge prescriptions while paperwork is pending',
      'Implement barcode scanning to reduce dispensing errors',
      'Stock high-frequency medicines at satellite counters in wards',
    ],
    Discharge: [
      'Start insurance pre-authorization 24 hours before planned discharge',
      'Assign dedicated discharge coordinators for TPA/corporate patients',
      'Create digital discharge checklist to eliminate missing steps',
    ],
  };

  const deptRecs = recs[dept.name] || recs['OPD'];

  return (
    <div style={{
      background: '#060d1a', border: '1px solid #1e3a5f',
      borderRadius: 16, padding: 24, marginTop: 20
    }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 16 }}>
        DEPARTMENT-SPECIFIC RECOMMENDATIONS
      </div>
      {deptRecs.map((rec, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, alignItems: 'flex-start',
          padding: '12px 0',
          borderBottom: i < deptRecs.length - 1 ? '1px solid #0d1f35' : 'none'
        }}>
          <div style={{
            background: `${color}20`, border: `1px solid ${color}`,
            borderRadius: 6, padding: '2px 8px',
            fontSize: 11, color, fontWeight: 700,
            minWidth: 28, textAlign: 'center'
          }}>
            {i + 1}
          </div>
          <div style={{ fontSize: 13, color: '#8ab4cc', lineHeight: 1.5 }}>{rec}</div>
        </div>
      ))}
    </div>
  );
}

// ── DEBT FORMULA BREAKDOWN ──
function DebtFormula({ dept }) {
  const factors = [
    { name: 'Wait Time', weight: '15%', value: dept.avg_delay_min, contrib: (0.15 * dept.avg_delay_min).toFixed(1), color: '#00d4ff' },
    { name: 'Lab TAT', weight: '10%', value: dept.avg_delay_min * 0.8, contrib: (0.10 * dept.avg_delay_min * 0.8).toFixed(1), color: '#ffd700' },
    { name: 'Bed Delay', weight: '10%', value: dept.avg_delay_min * 0.6, contrib: (0.10 * dept.avg_delay_min * 0.6).toFixed(1), color: '#ff8800' },
    { name: 'Transfers', weight: '10%', value: 2, contrib: (0.10 * 2 * 10).toFixed(1), color: '#a855f7' },
    { name: 'Rework', weight: '8%', value: 1, contrib: (0.08 * 1 * 10).toFixed(1), color: '#ff2244' },
  ];

  return (
    <div style={{
      background: '#060d1a', border: '1px solid #1e3a5f',
      borderRadius: 16, padding: 24, marginTop: 20
    }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 4 }}>
        DEBT SCORE BREAKDOWN
      </div>
      <div style={{ fontSize: 12, color: '#4a7fa5', marginBottom: 16 }}>
        Formula: 0.15(WT) + 0.10(TAT) + 0.10(BD) + 0.05(AD) + 0.10(TR) + 0.05(PS) + 0.05(LC) + 0.08(RW)
      </div>
      {factors.map((f, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8ab4cc' }}>
              {f.name} <span style={{ color: '#4a7fa5' }}>({f.weight})</span>
            </span>
            <span style={{ fontSize: 12, color: f.color, fontWeight: 700 }}>+{f.contrib}</span>
          </div>
          <div style={{ background: '#0a1628', borderRadius: 4, height: 6 }}>
            <div style={{
              width: `${Math.min(100, (f.contrib / dept.debt_score) * 100)}%`,
              height: '100%', background: f.color,
              borderRadius: 4,
              boxShadow: `0 0 6px ${f.color}`
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN DRILL DOWN ──
export default function DrillDown({ dept, onBack }) {
  const color = SEVERITY_COLORS[dept.severity] || '#ffd700';

  return (
    <div>
      {/* Back Button + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          background: 'transparent',
          border: '1px solid #1e3a5f',
          borderRadius: 8, padding: '8px 16px',
          color: '#4a7fa5', cursor: 'pointer', fontSize: 13
        }}>
          ← Back
        </button>
        <div>
          <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2 }}>
            DEPARTMENT DRILL DOWN
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>
            {dept.name} Department
          </div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: `${color}20`,
          border: `2px solid ${color}`,
          borderRadius: 10, padding: '8px 20px',
          fontSize: 14, color, fontWeight: 800
        }}>
          {dept.severity}
        </div>
      </div>

      {/* Stats */}
      <DeptStats dept={dept} />

      {/* Two Column Layout */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        {/* Left — SHAP */}
        <div style={{
          flex: 1, minWidth: 300,
          background: '#060d1a',
          border: '1px solid #1e3a5f',
          borderRadius: 16, padding: 24
        }}>
          <ShapChart dept={dept} />
        </div>

        {/* Right — Debt Formula */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <DebtFormula dept={dept} />
          <QuickRecs dept={dept} />
        </div>

      </div>
    </div>
  );
}
