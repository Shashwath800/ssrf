import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DnsResolver from './pages/DnsResolver';
import { ScanProvider } from './ScanContext';

function App() {
  return (
    <ScanProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dns-resolver" element={<DnsResolver />} />
        </Routes>
      </BrowserRouter>
    </ScanProvider>
  );
}

export default App;
