import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const SEVERITY_COLORS = {
  HEALTHY: '#00ff88', MODERATE: '#ffd700', HIGH: '#ff8800', CRITICAL: '#ff2244'
};

function RiskCard({ dept }) {
  const currentColor = SEVERITY_COLORS[dept.current_severity] || '#ffd700';
  const futureColor = SEVERITY_COLORS[dept.predicted_severity_2hr] || '#ffd700';
  const isEscalating = dept.predicted_severity_2hr !== dept.current_severity &&
    ['HIGH', 'CRITICAL'].includes(dept.predicted_severity_2hr);

  return (
    <div style={{
      background: '#060d1a',
      border: `2px solid ${isEscalating ? '#ff2244' : dept.surge_detected ? '#ff8800' : '#1e3a5f'}`,
      borderRadius: 16, padding: 20, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
            {dept.department}
          </div>
          {dept.surge_detected && (
            <div style={{
              background: '#ff880020', border: '1px solid #ff8800',
              borderRadius: 4, padding: '2px 8px',
              fontSize: 10, color: '#ff8800', fontWeight: 700, display: 'inline-block'
            }}>
              ⚡ {dept.warning}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 2 }}>TREND</div>
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: dept.trend > 0 ? '#ff4466' : '#00ff88'
          }}>
            {dept.trend > 0 ? '↑' : '↓'} {Math.abs(dept.trend).toFixed(2)}/hr
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Now */}
        <div style={{
          flex: 1, background: '#0a1628',
          border: `1px solid ${currentColor}`,
          borderRadius: 10, padding: '12px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 4 }}>NOW</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: currentColor }}>
            {dept.current_score}
          </div>
          <div style={{ fontSize: 11, color: currentColor }}>{dept.current_severity}</div>
        </div>

        <div style={{ textAlign: 'center', color: '#4a7fa5', fontSize: 10 }}>
          <div>→</div>
          <div>1hr</div>
        </div>

        {/* 1 hour */}
        <div style={{
          flex: 1, background: '#0a1628',
          border: `1px solid ${SEVERITY_COLORS[dept.predicted_severity_1hr] || '#ffd700'}`,
          borderRadius: 10, padding: '12px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 4 }}>+1 HOUR</div>
          <div style={{ fontSize: 22, fontWeight: 800,
            color: SEVERITY_COLORS[dept.predicted_severity_1hr] || '#ffd700' }}>
            {dept.predicted_1hr}
          </div>
          <div style={{ fontSize: 11, color: SEVERITY_COLORS[dept.predicted_severity_1hr] }}>
            {dept.predicted_severity_1hr}
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#4a7fa5', fontSize: 10 }}>
          <div>→</div>
          <div>2hr</div>
        </div>

        {/* 2 hours */}
        <div style={{
          flex: 1, background: '#0a1628',
          border: `2px solid ${futureColor}`,
          borderRadius: 10, padding: '12px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 10, color: '#4a7fa5', marginBottom: 4 }}>+2 HOURS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: futureColor }}>
            {dept.predicted_2hr}
          </div>
          <div style={{ fontSize: 11, color: futureColor }}>{dept.predicted_severity_2hr}</div>
        </div>
      </div>

      {/* Escalation warning */}
      {isEscalating && (
        <div style={{
          marginTop: 12, padding: '8px 12px',
          background: '#1a0000', border: '1px solid #ff2244',
          borderRadius: 8, fontSize: 12, color: '#ff6680'
        }}>
          ⚠️ {dept.department} predicted to escalate to {dept.predicted_severity_2hr} in 2 hours
          — consider preventive intervention now
        </div>
      )}
    </div>
  );
}

export default function FutureRisk() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/future-risk`);
      setPredictions(res.data.predictions || []);
    } catch (err) {
      console.error('Future risk error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    const t = setInterval(fetchPredictions, 30000);
    return () => clearInterval(t);
  }, []);

  const escalating = predictions.filter(d =>
    ['HIGH', 'CRITICAL'].includes(d.predicted_severity_2hr) &&
    d.predicted_severity_2hr !== d.current_severity);
  const surging = predictions.filter(d => d.surge_detected);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: 80, color: '#00d4ff', fontSize: 18 }}>
      Computing future risk predictions...
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#4a7fa5', letterSpacing: 2, marginBottom: 4 }}>
          PREDICTIVE INTELLIGENCE
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
          🔮 Future Department Risk
        </div>
        <div style={{ fontSize: 12, color: '#4a7fa5', marginTop: 2 }}>
          Rolling trend analysis — predicts severity escalation up to 2 hours ahead
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'DEPARTMENTS AT RISK', value: escalating.length, color: '#ff2244', icon: '🔴' },
          { label: 'SURGE DETECTED', value: surging.length, color: '#ff8800', icon: '⚡' },
          { label: 'STABLE DEPTS', value: predictions.length - escalating.length, color: '#00ff88', icon: '✅' },
          { label: 'PREDICTION WINDOW', value: '2 hrs', color: '#00d4ff', icon: '⏱️' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 130, background: '#060d1a',
            border: `1px solid ${s.color}30`, borderRadius: 12, padding: 16
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 10, color: '#4a7fa5', letterSpacing: 1, marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Methodology note */}
      <div style={{
        background: '#060d1a', border: '1px solid #00d4ff20',
        borderRadius: 10, padding: '10px 16px', marginBottom: 20,
        fontSize: 11, color: '#4a7fa5'
      }}>
        📊 Predictions use rolling hourly debt averages from SynHosp-ADT-India-2024.
        Surge detection triggers when trend exceeds +3 pts/hr.
        Note: Sudden emergency events (e.g. mass casualties) are outside model scope.
      </div>

      {/* Risk Cards */}
      {escalating.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#ff2244', letterSpacing: 1, marginBottom: 12 }}>
            🔴 ESCALATION ALERTS
          </div>
          {escalating.map((dept, i) => <RiskCard key={i} dept={dept} />)}
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, color: '#4a7fa5', letterSpacing: 1, marginBottom: 12 }}>
          ALL DEPARTMENTS
        </div>
        {predictions.map((dept, i) => <RiskCard key={i} dept={dept} />)}
      </div>

      
    </div>
  );
}
