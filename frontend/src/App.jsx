import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CheckIn from './pages/CheckIn';
import RegisterFaces from './pages/RegisterFaces';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/register-faces" element={<RegisterFaces />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;