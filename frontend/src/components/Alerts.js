import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

const SEVERITY_COLORS = {
  HEALTHY: '#00ff88', MODERATE: '#ffd700', HIGH: '#ff8800', CRITICAL: '#ff2244'
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/alerts`);
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error('Alert fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const t = setInterval(fetchAlerts, 10000);
    return () => clearInterval(t);
  }, []);

  const filtered = filter === 'ALL' ? alerts :
    alerts.filter(a => a.severity === filter);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>
          SMART ALERT SYSTEM
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
          🔔 Alert Log
        </div>
        <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
          Auto-filtered alerts with 30-minute cooldown — no alert fatigue
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'HEALTHY'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? (SEVERITY_COLORS[f] || '#0066ff') : '#060d1a',
            border: `1px solid ${SEVERITY_COLORS[f] || '#1e3a5f'}`,
            borderRadius: 8, padding: '6px 16px',
            color: filter === f ? '#000' : '#4a7fa5',
            fontSize: 12, cursor: 'pointer', fontWeight: filter === f ? 700 : 400
          }}>
            {f}
          </button>
        ))}
        
      </div>

      {/* Anti-fatigue info */}
      <div style={{
        background: '#060d1a', border: '1px solid #00d4ff30',
        borderRadius: 10, padding: '10px 16px', marginBottom: 20,
        display: 'flex', gap: 20, flexWrap: 'wrap'
      }}>
        {[
          { label: 'Cooldown Period', value: '60 minutes' },
          { label: 'Min Score Jump', value: '8 points' },
          { label: 'Min Threshold', value: 'Score ≥ 45' },
          { label: 'Total Alerts', value: alerts.length },
        ].map((item, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: '#4a7fa5' }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#00d4ff' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Alert List */}
      {loading && (
        <div style={{ textAlign: 'center', color: '#4a7fa5', padding: 40 }}>
          Loading alerts...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{
          background: '#060d1a', border: '1px solid #1e3a5f',
          borderRadius: 16, padding: 60, textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 16, color: '#00ff88' }}>No alerts for selected filter</div>
          <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 8 }}>
            System is monitoring — alerts appear when dept debt rises rapidly
          </div>
        </div>
      )}

      {filtered.map((alert, i) => {
        const color = SEVERITY_COLORS[alert.severity] || '#ffd700';
        const timeDisplay = alert.created_at
          ? String(alert.created_at).slice(11, 16)
          : '—';
        return (
          <div key={i} style={{
            background: '#060d1a', border: `1px solid ${color}30`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 16
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: `${color}20`, border: `1px solid ${color}`,
                  borderRadius: 4, padding: '2px 8px',
                  fontSize: 10, color, fontWeight: 700
                }}>
                  {alert.severity}
                </span>
                <span style={{ fontSize: 12, color: '#8ab4cc', fontWeight: 700 }}>
                  {alert.department}
                </span>
                <span style={{ fontSize: 11, color: '#4a7fa5' }}>
                  Score: {alert.debt_score}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#ffffff' }}>{alert.message}</div>
            </div>
            <div style={{ fontSize: 12, color: '#4a7fa5', flexShrink: 0 }}>
              {timeDisplay}
            </div>
          </div>
        );
      })}

      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#1e3a5f', marginTop: 16 }}>
          Showing {filtered.length} alert{filtered.length !== 1 ? 's' : ''} ·
          Auto-refreshes every 10 seconds · 30-min cooldown prevents alert fatigue
        </div>
      )}
    </div>
  );
}