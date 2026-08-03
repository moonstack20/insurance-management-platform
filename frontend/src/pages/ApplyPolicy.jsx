import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function ApplyPolicy() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    policy_type: "",
    coverage_amount: "",
    nominee_name: "",
    duration_months: "",
    medical_history: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/policy-applications", form);
      setSuccess(true);
      setForm({
        policy_type: "",
        coverage_amount: "",
        nominee_name: "",
        duration_months: "",
        medical_history: "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-teal-600 hover:underline mb-2"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-2xl font-semibold text-navy-700 mb-1">Apply for New Policy</h1>
        <p className="text-sm text-slate-500 mb-6">
          Submit your details for review. An agent will approve or reject your application.
        </p>

        {success && (
          <div className="mb-4 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded px-3 py-2">
            Application submitted successfully. You'll be notified once it's reviewed.
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Policy Type</label>
            <input
              type="text"
              name="policy_type"
              placeholder="e.g. Health Insurance"
              value={form.policy_type}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Coverage Amount (₹)</label>
            <input
              type="number"
              name="coverage_amount"
              value={form.coverage_amount}
              onChange={handleChange}
              required
              min="1"
              step="0.01"
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nominee Name</label>
            <input
              type="text"
              name="nominee_name"
              value={form.nominee_name}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (months)</label>
            <input
              type="number"
              name="duration_months"
              value={form.duration_months}
              onChange={handleChange}
              required
              min="1"
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Medical History <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="medical_history"
              value={form.medical_history}
              onChange={handleChange}
              rows={3}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-navy-700 text-white py-2 rounded hover:bg-navy-800 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ApplyPolicy;
