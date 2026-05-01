import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import api from '../utils/api';

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2 }}>{subtitle}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff' }}>{title}</div>
    </div>
  );
}

function PeakHourChart({ data, peakHour }) {
  const max = Math.max(...data.map(d => d.avg_debt_score));
  return (
    <div style={{
      background: '#060d1a', border: '1px solid #1e3a5f',
      borderRadius: 16, padding: 24, marginBottom: 20
    }}>
      <SectionHeader title="Peak Hour Debt Analysis" subtitle="PROCESS DEBT BY HOUR" />
      <div style={{ marginBottom: 12 }}>
        <span style={{
          background: '#ff224420', border: '1px solid #ff2244',
          borderRadius: 6, padding: '4px 12px',
          fontSize: 12, color: '#ff2244', fontWeight: 700
        }}>
          Peak Hour: {peakHour}:00 — {peakHour + 1}:00
        </span>
        <span style={{ fontSize: 12, color: '#4a7fa5', marginLeft: 12 }}>
          Highest process debt from your dataset
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0d1f35" />
          <XAxis dataKey="hour" tick={{ fill: '#4a7fa5', fontSize: 10 }}
            tickFormatter={h => `${h}:00`} />
          <YAxis tick={{ fill: '#4a7fa5', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8 }}
            labelStyle={{ color: '#8ab4cc' }}
            labelFormatter={h => `Hour: ${h}:00`}
            formatter={(val) => [val.toFixed(1), 'Debt Score']}
          />
          <Bar dataKey="avg_debt_score" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i}
                fill={entry.hour === peakHour ? '#ff2244' :
                      entry.avg_debt_score > max * 0.75 ? '#ff8800' :
                      entry.avg_debt_score > max * 0.5 ? '#ffd700' : '#00d4ff'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeptComparison({ departments }) {
  return (
    <div style={{
      background: '#060d1a', border: '1px solid #1e3a5f',
      borderRadius: 16, padding: 24, marginBottom: 20
    }}>
      <SectionHeader title="Department Debt Comparison" subtitle="DEPT PERFORMANCE" />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={departments} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#0d1f35" />
          <XAxis type="number" tick={{ fill: '#4a7fa5', fontSize: 10 }} domain={[0, 100]} />
          <YAxis dataKey="name" type="category" tick={{ fill: '#8ab4cc', fontSize: 12 }} width={80} />
          <Tooltip
            contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8 }}
            formatter={(val) => [val, 'Debt Score']}
          />
          <Bar dataKey="debt_score" radius={[0, 4, 4, 0]}>
            {departments.map((d, i) => (
              <Cell key={i}
                fill={d.severity === 'CRITICAL' ? '#ff2244' :
                      d.severity === 'HIGH' ? '#ff8800' :
                      d.severity === 'MODERATE' ? '#ffd700' : '#00ff88'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CascadeChain() {
  const stages = [
    { name: 'Admission', icon: '🏥', debt: 'Admission_Delay_Min', color: '#00d4ff' },
    { name: 'Lab/Diagnosis', icon: '🔬', debt: 'TAT_Min', color: '#ffd700' },
    { name: 'Rework', icon: '🔁', debt: 'Rework_Count', color: '#ff8800' },
    { name: 'Bed Allocation', icon: '🛏️', debt: 'Bed_Delay_Min', color: '#ff2244' },
    { name: 'Discharge', icon: '🚪', debt: 'Bottleneck_Index', color: '#a855f7' },
  ];

  return (
    <div style={{
      background: '#060d1a', border: '1px solid #1e3a5f',
      borderRadius: 16, padding: 24, marginBottom: 20
    }}>
      <SectionHeader title="Process Debt Cascade Chain" subtitle="BOTTLENECK PROPAGATION" />
      <div style={{ fontSize: 12, color: '#4a7fa5', marginBottom: 20 }}>
        How delay in one stage cascades into the next
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {stages.map((stage, i) => (
          <React.Fragment key={i}>
            <div style={{
              background: '#0a1628',
              border: `2px solid ${stage.color}`,
              borderRadius: 12, padding: '16px 20px',
              textAlign: 'center', minWidth: 120,
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{stage.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: stage.color }}>{stage.name}</div>
              <div style={{ fontSize: 10, color: '#4a7fa5', marginTop: 4 }}>{stage.debt}</div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff2244', fontSize: 20 }}>→</div>
                <div style={{ fontSize: 9, color: '#4a7fa5' }}>cascades</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: '#0a1628', border: '1px solid #ff224430',
        borderRadius: 10, fontSize: 12, color: '#ff8800'
      }}>
        ⚠️ Lab TAT delays cascade into Bed Delay which cascades into Discharge Delay — creating compounding debt across departments.
      </div>
    </div>
  );
}

function DebtMetrics({ departments, hourlyData }) {
  const avgDebt = departments.length
    ? (departments.reduce((s, d) => s + d.debt_score, 0) / departments.length).toFixed(1) : 0;
  const maxDebt = departments.length
    ? Math.max(...departments.map(d => d.debt_score)).toFixed(1) : 0;
  const worstDept = departments.length
    ? departments.reduce((a, b) => a.debt_score > b.debt_score ? a : b).name : 'N/A';
  const peakHour = hourlyData.length
    ? hourlyData.reduce((a, b) => a.avg_debt_score > b.avg_debt_score ? a : b).hour : 0;
  const monthlyLoss = Math.round(avgDebt * 150 * 24 * 30);

  const metrics = [
    { label: 'AVG HOSPITAL DEBT', value: avgDebt, unit: '/100', color: '#00d4ff', icon: '📊' },
    { label: 'HIGHEST DEPT DEBT', value: maxDebt, unit: '/100', color: '#ff8800', icon: '🔴' },
    { label: 'WORST DEPARTMENT', value: worstDept, unit: '', color: '#ff2244', icon: '⚠️' },
    { label: 'PEAK DEBT HOUR', value: `${peakHour}:00`, unit: '', color: '#ffd700', icon: '⏰' },
    { label: 'EST. MONTHLY LOSS', value: `₹${monthlyLoss.toLocaleString()}`, unit: '', color: '#ff8800', icon: '💸' },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      {metrics.map((m, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 140,
          background: '#060d1a', border: '1px solid #1e3a5f',
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
          <div style={{ fontSize: 10, color: '#4a7fa5', letterSpacing: 1, marginBottom: 4 }}>{m.label}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>
            {m.value}<span style={{ fontSize: 11, color: '#4a7fa5' }}>{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [departments, setDepartments] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [peakHour, setPeakHour] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, peakRes] = await Promise.all([
          api.getDepartments(),
          api.getPeakHours()
        ]);
        setDepartments(deptRes.departments || []);
        setHourlyData(peakRes.hourly_data || []);
        setPeakHour(peakRes.peak_hour || 0);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: 80, color: '#00d4ff', fontSize: 18 }}>
      Loading analytics from dataset...
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>
          PROCESS DEBT ANALYTICS
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
          📊 Hospital Intelligence Report
        </div>
        <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
          Derived from SynHosp-ADT-India-2024 · 5000 hospital records · XGBoost Models
        </div>
      </div>
      <DebtMetrics departments={departments} hourlyData={hourlyData} />
      <PeakHourChart data={hourlyData} peakHour={peakHour} />
      <DeptComparison departments={departments} />
      <CascadeChain />
    </div>
  );
}
