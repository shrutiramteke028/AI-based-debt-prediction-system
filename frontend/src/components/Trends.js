import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const DEPT_COLORS = {
  OPD: '#00d4ff', Lab: '#ffd700', Ward: '#00ff88',
  ICU: '#ff2244', Pharmacy: '#a855f7', Discharge: '#ff8800'
};

export default function Trends() {
  const [trends, setTrends] = useState({});
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(['OPD', 'Lab', 'ICU']);

  useEffect(() => {
    axios.get(`${BASE_URL}/api/trends`).then(res => {
      setTrends(res.data.trends || {});
      setDays(res.data.days || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Build combined chart data
  const chartData = days.map((day, i) => {
    const point = { day };
    Object.keys(trends).forEach(dept => {
      if (trends[dept][i]) {
        point[dept] = trends[dept][i].debt_score;
      }
    });
    return point;
  });

  // Find improving/worsening departments
  const deptAnalysis = Object.keys(trends).map(dept => {
    const data = trends[dept];
    if (!data || data.length < 2) return null;
    const first = data[0]?.debt_score || 0;
    const last = data[data.length - 1]?.debt_score || 0;
    const change = last - first;
    return { dept, first, last, change, improving: change < 0 };
  }).filter(Boolean);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: 80, color: '#00d4ff', fontSize: 18 }}>
      Loading trend data...
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>
          HISTORICAL TREND TRACKING
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
          📈 Department Debt Trends
        </div>
        <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
          Simulated 7-day trend derived from SynHosp-ADT-India-2024 dataset patterns
        </div>
      </div>

      {/* Department Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.keys(DEPT_COLORS).map(dept => (
          <button key={dept} onClick={() => {
            setSelected(prev => prev.includes(dept)
              ? prev.filter(d => d !== dept)
              : [...prev, dept])
          }} style={{
            background: selected.includes(dept) ? `${DEPT_COLORS[dept]}20` : '#060d1a',
            border: `1px solid ${selected.includes(dept) ? DEPT_COLORS[dept] : '#1e3a5f'}`,
            borderRadius: 8, padding: '6px 16px',
            color: selected.includes(dept) ? DEPT_COLORS[dept] : '#4a7fa5',
            fontSize: 12, cursor: 'pointer', fontWeight: selected.includes(dept) ? 700 : 400
          }}>
            {dept}
          </button>
        ))}
      </div>

      {/* Line Chart */}
      <div style={{
        background: '#060d1a', border: '1px solid #1e3a5f',
        borderRadius: 16, padding: 24, marginBottom: 20
      }}>
        <div style={{ fontSize: 12, color: '#4a7fa5', letterSpacing: 1, marginBottom: 16 }}>
          WEEKLY DEBT TREND — ALL DEPARTMENTS
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0d1f35" />
            <XAxis dataKey="day" tick={{ fill: '#4a7fa5', fontSize: 11 }} />
            <YAxis tick={{ fill: '#4a7fa5', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8 }}
              labelStyle={{ color: '#8ab4cc' }}
            />
            <Legend wrapperStyle={{ color: '#8ab4cc', fontSize: 12 }} />
            {selected.map(dept => (
              <Line key={dept} type="monotone" dataKey={dept}
                stroke={DEPT_COLORS[dept]} strokeWidth={2}
                dot={{ fill: DEPT_COLORS[dept], r: 4 }}
                activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Improving vs Worsening */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, background: '#060d1a', border: '1px solid #00ff8830',
          borderRadius: 16, padding: 20
        }}>
          <div style={{ fontSize: 12, color: '#00ff88', letterSpacing: 1, marginBottom: 12 }}>
            ✅ IMPROVING DEPARTMENTS
          </div>
          {deptAnalysis.filter(d => d.improving).map((d, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid #0d1f35'
            }}>
              <span style={{ fontSize: 13, color: '#8ab4cc' }}>{d.dept}</span>
              <span style={{ fontSize: 13, color: '#00ff88', fontWeight: 700 }}>
                ↓ {Math.abs(d.change).toFixed(1)} pts
              </span>
            </div>
          ))}
          {deptAnalysis.filter(d => d.improving).length === 0 && (
            <div style={{ fontSize: 12, color: '#4a7fa5' }}>No improving departments</div>
          )}
        </div>

        <div style={{
          flex: 1, background: '#060d1a', border: '1px solid #ff224430',
          borderRadius: 16, padding: 20
        }}>
          <div style={{ fontSize: 12, color: '#ff2244', letterSpacing: 1, marginBottom: 12 }}>
            ⚠️ WORSENING DEPARTMENTS
          </div>
          {deptAnalysis.filter(d => !d.improving).map((d, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid #0d1f35'
            }}>
              <span style={{ fontSize: 13, color: '#8ab4cc' }}>{d.dept}</span>
              <span style={{ fontSize: 13, color: '#ff4466', fontWeight: 700 }}>
                ↑ {Math.abs(d.change).toFixed(1)} pts
              </span>
            </div>
          ))}
          {deptAnalysis.filter(d => !d.improving).length === 0 && (
            <div style={{ fontSize: 12, color: '#4a7fa5' }}>No worsening departments</div>
          )}
        </div>
      </div>

      {/* Data note */}
      <div style={{
        background: '#0a1628', border: '1px solid #1e3a5f',
        borderRadius: 10, padding: '10px 16px',
        fontSize: 11, color: '#4a7fa5'
      }}>
        📊 Trends derived from SynHosp-ADT-India-2024 dataset temporal grouping.
        Real deployment connects to HIS database for actual historical records.
      </div>
    </div>
  );
}
