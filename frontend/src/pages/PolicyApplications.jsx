import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PolicyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const customerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? c.name : `#${id}`;
  };

  const fetchAll = async (status = "") => {
    setLoading(true);
    setError("");
    try {
      const [appsRes, customersRes] = await Promise.all([
        api.get("/policy-applications", { params: status ? { status } : {} }),
        api.get("/customers"),
      ]);
      setApplications(appsRes.data.applications);
      setCustomers(customersRes.data.customers);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(statusFilter);
  }, []);

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    fetchAll(value);
  };

  const handleApprove = async (id) => {
    setError("");
    setProcessingId(id);
    try {
      await api.post(`/policy-applications/${id}/approve`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to approve application");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setError("");
    setProcessingId(id);
    try {
      await api.post(`/policy-applications/${id}/reject`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reject application");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-teal-600 hover:underline mb-2"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-2xl font-semibold text-navy-700 mb-6">Policy Applications</h1>

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
          ) : applications.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No applications found.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Policy Type</th>
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Nominee</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">{customerName(a.customer_id)}</td>
                    <td className="px-4 py-3">{a.policy_type}</td>
                    <td className="px-4 py-3">₹{a.coverage_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{a.duration_months} mo</td>
                    <td className="px-4 py-3">{a.nominee_name || "-"}</td>
                    <td className="px-4 py-3">{formatDate(a.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[a.status] || ""}`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap text-sm">
                      {a.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(a.id)}
                            disabled={processingId === a.id}
                            className="text-green-600 hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(a.id)}
                            disabled={processingId === a.id}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default PolicyApplications;
