import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DnsResolver from './pages/DnsResolver';
import AttackDemo from './pages/AttackDemo';
import RiskAnalyzer from './pages/RiskAnalyzer';
import MlAnalyzer from './pages/MlAnalyzer';
import WebhookSettings from './pages/WebhookSettings';
import LiveMonitor from './pages/LiveMonitor';
import Landing from './pages/Landing';
import { ScanProvider } from './ScanContext';

function App() {
  return (
    <ScanProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/dns-resolver" element={<DnsResolver />} />
          <Route path="/attack-demo" element={<AttackDemo />} />
          <Route path="/risk-analyzer" element={<RiskAnalyzer />} />
          <Route path="/ml-analyzer" element={<MlAnalyzer />} />
          <Route path="/webhook-settings" element={<WebhookSettings />} />
          <Route path="/live-monitor" element={<LiveMonitor />} />
        </Routes>
      </BrowserRouter>
    </ScanProvider>
  );
}

export default App;
