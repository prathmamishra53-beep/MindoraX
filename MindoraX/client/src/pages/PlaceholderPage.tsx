import React from 'react';

interface Props {
  title: string;
  icon: string;
  desc: string;
}

const PlaceholderPage: React.FC<Props> = ({ title, icon, desc }) => (
  <div className="placeholder-page">
    <div className="placeholder-content">
      <div className="placeholder-icon">{icon}</div>
      <h2 className="placeholder-title">{title}</h2>
      <p className="placeholder-desc">{desc}</p>
      <div className="placeholder-badge">Coming Soon</div>
    </div>
  </div>
);

export default PlaceholderPage;
