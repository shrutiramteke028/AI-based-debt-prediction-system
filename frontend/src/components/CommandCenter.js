import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import api from '../utils/api';

// ─── COLORS ───
const SEVERITY_COLORS = {
  HEALTHY:  { bg: '#0d2b1e', border: '#00ff88', text: '#00ff88', dot: '#00ff88' },
  MODERATE: { bg: '#2b2000', border: '#ffd700', text: '#ffd700', dot: '#ffd700' },
  HIGH:     { bg: '#2b1500', border: '#ff8800', text: '#ff8800', dot: '#ff8800' },
  CRITICAL: { bg: '#2b0000', border: '#ff2244', text: '#ff2244', dot: '#ff2244' },
};

// ─── LIVE CLOCK ───
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#00d4ff', letterSpacing: 3 }}>
        {time.toLocaleTimeString()}
      </div>
      <div style={{ fontSize: 12, color: '#4a7fa5' }}>
        {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}

// ─── DEPARTMENT CARD ───
function DeptCard({ dept, onClick }) {
  const colors = SEVERITY_COLORS[dept.severity] || SEVERITY_COLORS.MODERATE;
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (dept.severity === 'CRITICAL') {
      const t = setInterval(() => setPulse(p => !p), 800);
      return () => clearInterval(t);
    }
  }, [dept.severity]);

  return (
    <div onClick={() => onClick(dept)} style={{
      background: colors.bg,
      border: `2px solid ${pulse ? '#ff000080' : colors.border}`,
      borderRadius: 12,
      padding: '20px 16px',
      cursor: 'pointer',
      transition: 'all 0.3s',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#8ab4cc', fontWeight: 600 }}>{dept.name}</span>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: colors.dot,
          boxShadow: `0 0 8px ${colors.dot}`
        }} />
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: colors.text, lineHeight: 1 }}>
        {dept.debt_score}
      </div>
      <div style={{ fontSize: 11, color: colors.text, marginTop: 4, fontWeight: 600 }}>
        {dept.severity}
      </div>
      <div style={{ fontSize: 11, color: '#4a7fa5', marginTop: 8 }}>
        {dept.patients_waiting} waiting · {dept.avg_delay_min} min avg
      </div>
    </div>
  );
}

// ─── DEBT PULSE CHART ───
function DebtPulse({ data }) {
  const latest = data[data.length - 1]?.debt_score || 0;
  const trend = data.length > 1
    ? data[data.length - 1].debt_score - data[data.length - 2].debt_score
    : 0;

  return (
    <div style={{
      background: '#060d1a',
      border: '1px solid #1e3a5f',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: '#4a7fa5', marginBottom: 4 }}>DEBT PULSE MONITOR</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#00d4ff' }}>{latest.toFixed(1)}</span>
            <span style={{ fontSize: 14, color: trend > 0 ? '#ff4466' : '#00ff88' }}>
              {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)} /3min
            </span>
          </div>
        </div>
        <div style={{
          background: '#0a1628',
          border: '1px solid #1e3a5f',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 12,
          color: '#4a7fa5'
        }}>
          LIVE · Last 60 min
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0d1f35" />
          <XAxis dataKey="time" tick={{ fill: '#4a7fa5', fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#4a7fa5', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8 }}
            labelStyle={{ color: '#8ab4cc' }}
            itemStyle={{ color: '#00d4ff' }}
          />
          <Line
            type="monotone"
            dataKey="debt_score"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#00d4ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── CRISIS BAR ───
function CrisisBar({ departments }) {
  const critical = departments.filter(d => d.severity === 'CRITICAL');
  const [seconds, setSeconds] = useState(300);

  useEffect(() => {
    if (critical.length > 0) {
      const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [critical.length]);

  if (critical.length === 0) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = (seconds / 300) * 100;

  return (
    <div style={{
      background: '#1a0000',
      border: '1px solid #ff2244',
      borderRadius: 12,
      padding: '14px 20px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ color: '#ff2244', fontWeight: 700, fontSize: 14 }}>
            CRITICAL ALERT — {critical.map(d => d.name).join(', ')} Department
          </span>
        </div>
        <div style={{ color: '#ff2244', fontWeight: 800, fontSize: 20, fontFamily: 'monospace' }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
      </div>
      <div style={{ background: '#2b0000', borderRadius: 4, height: 6 }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: '#ff2244',
          borderRadius: 4,
          transition: 'width 1s linear',
          boxShadow: '0 0 8px #ff2244'
        }} />
      </div>
      <div style={{ fontSize: 11, color: '#ff6680', marginTop: 6 }}>
        Estimated time before cascade failure
      </div>
    </div>
  );
}

// ─── STATS ROW ───
function StatsRow({ departments }) {
  const avgDebt = departments.length
    ? (departments.reduce((s, d) => s + d.debt_score, 0) / departments.length).toFixed(1)
    : 0;
  const critical = departments.filter(d => d.severity === 'CRITICAL').length;
  const totalWaiting = departments.reduce((s, d) => s + d.patients_waiting, 0);
  const rupees = (avgDebt * 150 * 24).toFixed(0);

  const stats = [
    { label: 'AVG DEBT SCORE', value: avgDebt, unit: '/100', color: '#00d4ff' },
    { label: 'CRITICAL DEPTS', value: critical, unit: '', color: '#ff2244' },
    { label: 'PATIENTS WAITING', value: totalWaiting, unit: '', color: '#ffd700' },
    { label: 'EST. DAILY LOSS', value: `₹${Number(rupees).toLocaleString()}`, unit: '', color: '#ff8800' },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 140,
          background: '#060d1a',
          border: '1px solid #1e3a5f',
          borderRadius: 10,
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 6, letterSpacing: 1 }}>{s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
            {s.value}<span style={{ fontSize: 12, color: '#4a7fa5' }}>{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMMAND CENTER ───
export default function CommandCenter({ onDeptClick, onAnalyzeClick }) {
  const [departments, setDepartments] = useState([]);
  const [pulse, setPulse] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [deptRes, pulseRes] = await Promise.all([
        api.getDepartments(),
        api.getDebtPulse()
      ]);
      setDepartments(deptRes.departments || []);
      setPulse(pulseRes.pulse || []);
    } catch (err) {
      console.error('API error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 15000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#00d4ff', fontSize: 18 }}>Loading hospital data...</div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>
            PROCESS INTELLIGENCE CENTER
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
            🏥 HospitalDebt-AI
          </div>
          <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
            Real-time Process Debt Monitoring System
          </div>
        </div>
        <LiveClock />
      </div>

      {/* Crisis Alert */}
      <CrisisBar departments={departments} />

      {/* Stats Row */}
      <StatsRow departments={departments} />

      {/* Department Cards */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 1, marginBottom: 12 }}>
          DEPARTMENT HEALTH
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {departments.map((dept, i) => (
            <DeptCard key={i} dept={dept} onClick={onDeptClick} />
          ))}
        </div>
      </div>

      {/* Debt Pulse */}
      <div style={{ marginBottom: 20 }}>
        <DebtPulse data={pulse} />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onAnalyzeClick} style={{
          background: 'linear-gradient(135deg, #0066ff, #0044aa)',
          border: 'none',
          borderRadius: 10,
          padding: '14px 28px',
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          flex: 1,
        }}>
          🔍 Run AI Analysis
        </button>
        <button onClick={fetchData} style={{
          background: '#060d1a',
          border: '1px solid #1e3a5f',
          borderRadius: 10,
          padding: '14px 28px',
          color: '#4a7fa5',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}
