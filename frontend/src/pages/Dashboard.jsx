import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-navy-700">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
        <p className="text-slate-700">
          Welcome, <span className="font-medium">{user.name}</span>
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Role: <span className="capitalize">{user.role}</span>
        </p>
        <p className="text-slate-500 text-sm">Email: {user.email}</p>
      </div>
    </div>
  );
}

export default Dashboard;
