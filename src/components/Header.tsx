import React from 'react';

const logoUrl = '/logo_AV.svg';

const Header: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <img src={logoUrl} alt="Audio Visualizer Logo" style={{ width: 48, height: 48 }} />
    <span style={{ fontFamily: 'Jersey 10, sans-serif', fontSize: 24, color: '#0F172A', letterSpacing: 1 }}>AUDIO VISUALIZER</span>
  </div>
);

export default Header; 