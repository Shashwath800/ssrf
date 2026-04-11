import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import DnsControl from './pages/DnsControl';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dns" element={<DnsControl />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
