import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DnsResolver from './pages/DnsResolver';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dns-resolver" element={<DnsResolver />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
