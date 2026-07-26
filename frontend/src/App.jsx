import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Policies from "./pages/Policies";
import Payments from "./pages/Payments";
import Claims from "./pages/Claims";
import Documents from "./pages/Documents";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/policies" element={<Policies />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/claims" element={<Claims />} />
      <Route path="/documents" element={<Documents />} />
    </Routes>
  );
}

export default App;
