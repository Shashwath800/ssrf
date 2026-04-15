import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DnsResolver from './pages/DnsResolver';
import AttackDemo from './pages/AttackDemo';
import RiskAnalyzer from './pages/RiskAnalyzer';
import WebhookSettings from './pages/WebhookSettings';
import LiveMonitor from './pages/LiveMonitor';
import { ScanProvider } from './ScanContext';

function App() {
  return (
    <ScanProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dns-resolver" element={<DnsResolver />} />
          <Route path="/attack-demo" element={<AttackDemo />} />
          <Route path="/risk-analyzer" element={<RiskAnalyzer />} />
          <Route path="/webhook-settings" element={<WebhookSettings />} />
          <Route path="/live-monitor" element={<LiveMonitor />} />
        </Routes>
      </BrowserRouter>
    </ScanProvider>
  );
}

export default App;
