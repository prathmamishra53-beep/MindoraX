import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', fullScreen = false, message }) => {
  const spinnerClass = `spinner spinner-${size}`;
  
  if (fullScreen) {
    return (
      <div className="fullscreen-spinner-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 15, 30, 0.8)', zIndex: 9999 }}>
        <div className={spinnerClass}></div>
        {message && <p style={{ marginTop: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className={spinnerClass}></div>
      {message && <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
