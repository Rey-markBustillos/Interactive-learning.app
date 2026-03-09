import { Routes, Route } from "react-router-dom";
import LandingPage from "./Apps/landingpage/LandingPage";
import Login from "./Apps/landingpage/Login";
import Register from "./Apps/landingpage/Register";
import Dashboard from "./Apps/Pages/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;