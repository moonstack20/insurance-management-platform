import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const STATUS_STYLES = {
  paid: "bg-green-100 text-green-700",
  due: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
};

function formatDate(isoDate) {
  if (!isoDate) return "-";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [form, setForm] = useState({
    policy_id: "",
    amount: "",
    payment_date: "",
    payment_status: "due",
  });

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canManage = user && (user.role === "admin" || user.role === "agent");

  const policyLabel = (id) => {
    const p = policies.find((p) => p.id === id);
    return p ? `${p.policy_number} (${p.policy_type})` : `#${id}`;
  };

  const fetchAll = async (status = "") => {
    setLoading(true);
    setError("");
    try {
      const [paymentsRes, policiesRes] = await Promise.all([
        api.get("/payments", { params: status ? { payment_status: status } : {} }),
        api.get("/policies"),
      ]);
      setPayments(paymentsRes.data.payments);
      setPolicies(policiesRes.data.policies);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load payments");
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

  const openAddForm = () => {
    setForm({ policy_id: "", amount: "", payment_date: "", payment_status: "due" });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/payments", form);
      setShowForm(false);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save payment");
    }
  };

  const handlePayNow = async (id) => {
    setError("");
    try {
      await api.post(`/payments/${id}/pay`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process payment");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment record? This cannot be undone.")) return;
    setError("");
    try {
      await api.delete(`/payments/${id}`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete payment");
    }
  };

  const handleDownloadReceipt = async (id) => {
    setError("");
    setDownloadingId(id);
    try {
      const res = await api.get(`/receipts/payment/${id}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipt_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6EE] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-teal-600 hover:underline mb-2"
            >
              &larr; Back to Dashboard
            </button>
            <h1 className="text-2xl font-semibold text-navy-700">Premium Payments</h1>
          </div>
          {canManage && (
            <button
              onClick={openAddForm}
              className="bg-navy-700 text-white px-4 py-2 rounded hover:bg-navy-800 transition"
            >
              + Add Payment
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <select
            value={statusFilter}
            onChange={handleFilterChange}
            className="border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
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
          ) : payments.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No payments found.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{policyLabel(p.policy_id)}</td>
                    <td className="px-4 py-3">₹{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[p.payment_status] || ""}`}
                      >
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-3 whitespace-nowrap text-sm">
                      {p.payment_status !== "paid" && (
                        <button
                          onClick={() => handlePayNow(p.id)}
                          className="text-green-600 hover:underline"
                        >
                          Pay Now
                        </button>
                      )}
                      {p.payment_status === "paid" && (
                        <button
                          onClick={() => handleDownloadReceipt(p.id)}
                          disabled={downloadingId === p.id}
                          className="text-teal-600 hover:underline disabled:opacity-50"
                        >
                          {downloadingId === p.id ? "Downloading..." : "Download Receipt"}
                        </button>
                      )}
                      {user.role === "admin" && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
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
            <h2 className="text-xl font-semibold text-navy-700 mb-4">Add Payment</h2>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Policy
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
                  Amount (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleFormChange}
                  required
                  min="1"
                  step="0.01"
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Due / Payment Date
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={form.payment_date}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  name="payment_status"
                  value={form.payment_status}
                  onChange={handleFormChange}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="due">Due</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-navy-700 text-white py-2 rounded hover:bg-navy-800 transition"
                >
                  Save
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

export default Payments;
