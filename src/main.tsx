import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMonitoring } from './utils/monitoring';
import { terminateWorkers } from './services/rag';

initMonitoring();

// Register cleanup
window.addEventListener('beforeunload', () => {
  terminateWorkers();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
