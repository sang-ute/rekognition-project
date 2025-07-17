import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CheckIn from './pages/CheckIn';
import RegisterFaces from './pages/RegisterFaces';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/register-faces" element={<RegisterFaces />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;