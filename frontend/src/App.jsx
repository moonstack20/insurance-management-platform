import { Routes, Route } from "react-router-dom";

// Pages get built as each day's module is completed
// import Login from "./pages/Login";
// import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <h1 className="text-2xl font-semibold text-navy-700">
              Insurance Management Platform — setup complete
            </h1>
          </div>
        }
      />
      {/* <Route path="/login" element={<Login />} /> */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
    </Routes>
  );
}

export default App;
