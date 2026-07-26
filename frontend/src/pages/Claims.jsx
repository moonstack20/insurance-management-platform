import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const RISK_STYLES = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-red-100 text-red-700",
};

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Claims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ policy_id: "", claim_amount: "", reason: "" });

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canReview = user && (user.role === "admin" || user.role === "agent");

  const policyLabel = (id) => {
    const p = policies.find((p) => p.id === id);
    return p ? `${p.policy_number} (${p.policy_type})` : `#${id}`;
  };

  const fetchAll = async (status = "") => {
    setLoading(true);
    setError("");
    try {
      const [claimsRes, policiesRes] = await Promise.all([
        api.get("/claims", { params: status ? { status } : {} }),
        api.get("/policies", { params: { status: "active" } }),
      ]);
      setClaims(claimsRes.data.claims);
      setPolicies(policiesRes.data.policies);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    fetchAll(value);
  };

  const openForm = () => {
    setForm({ policy_id: "", claim_amount: "", reason: "" });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/claims", form);
      setShowForm(false);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setError("");
    try {
      await api.post(`/claims/${id}/approve`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve claim");
    }
  };

  const handleReject = async (id) => {
    setError("");
    try {
      await api.post(`/claims/${id}/reject`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject claim");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this claim? This cannot be undone.")) return;
    setError("");
    try {
      await api.delete(`/claims/${id}`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete claim");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-teal-600 hover:underline mb-2"
            >
              &larr; Back to Dashboard
            </button>
            <h1 className="text-2xl font-semibold text-navy-700">Claims</h1>
          </div>
          <button
            onClick={openForm}
            className="bg-navy-700 text-white px-4 py-2 rounded hover:bg-navy-800 transition"
          >
            + Submit Claim
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={handleFilterChange}
            className="border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-slate-500 text-center">Loading...</p>
          ) : claims.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No claims found.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">AI Risk</th>
                  <th className="px-4 py-3">Status</th>
                  {canReview && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">{policyLabel(c.policy_id)}</td>
                    <td className="px-4 py-3">₹{c.claim_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 max-w-xs">{c.reason}</td>
                    <td className="px-4 py-3">{formatDateTime(c.submission_date)}</td>
                    <td className="px-4 py-3">
                      {c.risk_level && (
                        <div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${RISK_STYLES[c.risk_level] || ""}`}
                          >
                            {c.risk_level}
                          </span>
                          {c.risk_reason && (
                            <p className="text-xs text-slate-500 mt-1 max-w-xs">
                              {c.risk_reason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[c.status] || ""}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    {canReview && (
                      <td className="px-4 py-3 space-x-2 whitespace-nowrap text-sm">
                        {c.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(c.id)}
                              className="text-green-600 hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(c.id)}
                              className="text-orange-600 hover:underline"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {user.role === "admin" && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-navy-700 mb-4">Submit Claim</h2>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Policy (active only)
                </label>
                <select
                  name="policy_id"
                  value={form.policy_id}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policy_number} ({p.policy_type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Claim Amount (₹)
                </label>
                <input
                  type="number"
                  name="claim_amount"
                  value={form.claim_amount}
                  onChange={handleFormChange}
                  required
                  min="1"
                  step="0.01"
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleFormChange}
                  required
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-navy-700 text-white py-2 rounded hover:bg-navy-800 transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Claims;
