import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";
import RegisterFaces from "./pages/RegisterFaces";
import Dashboard from "./pages/Dashboard";
import { LivenessQuickStartReact } from "./components/LivenessQuickStart";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register-faces" element={<RegisterFaces />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/liveness-quickstart" element={<LivenessQuickStartReact />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
