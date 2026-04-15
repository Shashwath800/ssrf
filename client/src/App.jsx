import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DnsResolver from './pages/DnsResolver';
import AttackDemo from './pages/AttackDemo';
import RiskAnalyzer from './pages/RiskAnalyzer';
import WebhookSettings from './pages/WebhookSettings';
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
        </Routes>
      </BrowserRouter>
    </ScanProvider>
  );
}

export default App;
