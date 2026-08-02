import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAF6EE]">
      {/* Hero panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1B4332, #2D6A4F)" }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xl font-semibold tracking-wide">InsureSure</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Protect What Matters.
          </h1>
          <p className="text-lg text-mint-100 max-w-md leading-relaxed" style={{ color: "#D8F3DC" }}>
            Manage policies, track claims, and stay on top of every premium
            — all powered by AI-driven insights.
          </p>
        </div>

        <div className="relative z-10 flex gap-8 text-sm" style={{ color: "#95D5B2" }}>
          <div>
            <p className="text-2xl font-semibold text-white">AI</p>
            <p>Risk Scoring</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">Real-time</p>
            <p>Claim Tracking</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">Secure</p>
            <p>Document Vault</p>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full opacity-10 bg-white" />
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-lg font-semibold text-navy-700">InsureSure</span>
          </div>

          <h2 className="text-2xl font-semibold text-navy-700 mb-1 text-center lg:text-left">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500 mb-6 text-center lg:text-left">
            Sign in to manage your policies and claims
          </p>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-2 rounded transition disabled:opacity-50"
              style={{ background: "linear-gradient(90deg, #2D6A4F, #40916C)" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-sm text-slate-600 text-center mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-teal-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
