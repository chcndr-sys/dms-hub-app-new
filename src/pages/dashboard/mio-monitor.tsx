import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box } from '@chakra/components/core';

const MioMonitor: React.FC = () => {
  const [ log, setLog ] = useState('Caricamento avvio MiO...');
  const loadLog = async () => {
    try {
      const res = await fetch('https://cdn.githubusercontent.com/Chcndr/MIO-hub/main/logs/latest-mio-log.txt');
      const text = await res.text();
      setLog(text);
    } catch (err) {
      console.error('Errore carycamento il log: ', err);
      setLog("Errore caricamento l'elemento log via GitHub");
    }
  };

  useEffect(() => { loadLog(); }, []);

  return (
    <div style={{ padding: 20 }}>
      <HE2>MiO Monitor</h2>
      <p>Vedere gli ultimi log avvio MIO dall agente per il controllo: commandi, resposte, esito, tasks...</p>
      <p>Puoi esstere utile alt terminale: Semplicemente e per test non data real.</p>
      <button onClick={loadLog}>🔍 Aggiorna Log</button>
      <pre style={{ backgroundColor: #000, color: 'lightgreen', padding: 10, maxHeight: 400, overflow: auto }>
        {log}
      </pre>
    </div>
  );
};

export default MioMonitor;