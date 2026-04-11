import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ScanContext = createContext();

export function ScanProvider({ children }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scanHistory')) || []; } catch { return []; }
  });
  const sourceRef = useRef(null);

  const handleScanStart = useCallback(() => {
    setIsScanning(true);
    setScanResult(null);
  }, []);

  const runScan = useCallback((targetUrl) => {
    if (!targetUrl) return;
    handleScanStart();

    if (sourceRef.current) sourceRef.current.close();

    const source = new EventSource(`/api/scan?url=${encodeURIComponent(targetUrl)}`);
    sourceRef.current = source;
    
    let currentResult = { url: targetUrl, status: 'RUNNING', steps: [], logs: [], isDone: false };

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'start') {
        currentResult.logs.push({ timestamp: new Date().toISOString(), step: 'Scanner', status: 'INFO', message: `─── Scanning: ${data.url} ───` });
        setScanResult({ ...currentResult });
      } else if (data.type === 'step') {
        currentResult.steps.push(data.stepResult);
        currentResult.logs.push({
          timestamp: new Date().toISOString(),
          step: data.stepResult.step,
          status: data.stepResult.status,
          message: data.stepResult.reason || data.stepResult.data?.note || `${data.stepResult.step}: ${data.stepResult.status}`
        });
        setScanResult({ ...currentResult });
      } else if (data.type === 'done') {
        currentResult.status = data.finalStatus;
        currentResult.isDone = true;
        currentResult.logs.push({ timestamp: new Date().toISOString(), step: 'Result', status: data.finalStatus === 'BLOCKED' ? 'BLOCK' : 'PASS', message: `Final verdict: ${data.finalStatus}` });
        setScanResult({ ...currentResult });
        setScanHistory(prev => {
          const newHistory = [...prev, { url: targetUrl, status: data.finalStatus, time: new Date().toLocaleTimeString() }];
          localStorage.setItem('scanHistory', JSON.stringify(newHistory.slice(-20))); // save last 20
          return newHistory;
        });
        setIsScanning(false);
        source.close();
      }
    };

    source.onerror = () => {
      currentResult.status = 'ERROR';
      currentResult.isDone = true;
      currentResult.logs.push({ timestamp: new Date().toISOString(), step: 'Network', status: 'ERROR', message: 'Connection Error or timeout' });
      setScanResult({ ...currentResult });
      setScanHistory(prev => {
        const newHistory = [...prev, { url: targetUrl, status: 'ERROR', time: new Date().toLocaleTimeString() }];
        localStorage.setItem('scanHistory', JSON.stringify(newHistory.slice(-20)));
        return newHistory;
      });
      setIsScanning(false);
      source.close();
    };

    return new Promise((resolve) => {
      const checkDone = setInterval(() => { if (currentResult.isDone) { clearInterval(checkDone); resolve(); } }, 500);
    });
  }, [handleScanStart]);

  return (
    <ScanContext.Provider value={{
      isScanning, scanResult, scanHistory, runScan, handleScanStart
    }}>
      {children}
    </ScanContext.Provider>
  );
}

export const useScan = () => useContext(ScanContext);
