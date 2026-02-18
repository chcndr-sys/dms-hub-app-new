import React from 'react';
import { useLocation } from 'wouter';

export default function HomeButtons() {
  const [, setLocation] = useLocation();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      <button onClick={() => setLocation('/mio')}>MIO System</button>
    </div>
  );
}
