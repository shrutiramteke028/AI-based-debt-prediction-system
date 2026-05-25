import React, { useState } from 'react';
import CommandCenter from './components/CommandCenter';
import AnalysisPanel from './components/anaPanel';
import Analytics from './components/Analytics';
import DrillDown from './components/DrillDown';
import WhatIf from './components/WhatIf';
import Alerts from './components/Alerts';
import Trends from './components/Trends';
import FutureRisk from './components/FutureRisk';

export default function App() {
  const [screen, setScreen] = useState('command');
  const [selectedDept, setSelectedDept] = useState(null);

  const navItems = [
    { id: 'command', label: '⚡ Command Center' },
    { id: 'analyze', label: '🔍 AI Analysis' },
    { id: 'whatif', label: '🎛️ What-If' },
    { id: 'future', label: '🔮 Future Risk' },
    { id: 'alerts', label: '🔔 Alerts' },
    { id: 'trends', label: '📈 Trends' },
    { id: 'analytics', label: '📊 Analytics' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      color: 'white', fontFamily: "'Segoe UI', sans-serif",
    }}>
      {/* Navigation Bar */}
      <div style={{
        background: '#060d1a', borderBottom: '1px solid #1e3a5f',
        padding: '10px 24px', display: 'flex', gap: 6,
        alignItems: 'center', flexWrap: 'wrap'
      }}>
        {navItems.map(nav => (
          <button key={nav.id} onClick={() => setScreen(nav.id)} style={{
            background: screen === nav.id ? '#0066ff' : 'transparent',
            border: screen === nav.id ? 'none' : '1px solid #1e3a5f',
            borderRadius: 8, padding: '6px 14px',
            color: screen === nav.id ? 'white' : '#4a7fa5',
            fontSize: 12, cursor: 'pointer',
            fontWeight: screen === nav.id ? 700 : 400,
          }}>
            {nav.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#1e3a5f' }}>
          HospitalDebt-AI v2.0
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {screen === 'command' && (
          <CommandCenter
            onDeptClick={(dept) => { setSelectedDept(dept); setScreen('drilldown'); }}
            onAnalyzeClick={() => setScreen('analyze')}
          />
        )}
        {screen === 'analyze' && <AnalysisPanel />}
        {screen === 'whatif' && <WhatIf />}
        {screen === 'future' && <FutureRisk />}
        {screen === 'alerts' && <Alerts />}
        {screen === 'trends' && <Trends />}
        {screen === 'analytics' && <Analytics />}
        {screen === 'drilldown' && selectedDept && (
          <DrillDown dept={selectedDept} onBack={() => setScreen('command')} />
        )}
      </div>
    </div>
  );
}
