import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  expired: "bg-slate-200 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

function Policies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [form, setForm] = useState({
    customer_id: "",
    policy_type: "",
    premium_amount: "",
    start_date: "",
    end_date: "",
  });

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canManage = user && (user.role === "admin" || user.role === "agent");

  const customerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? c.name : `#${id}`;
  };
  const formatDate = (isoDate) => {
    if (!isoDate) return "-";
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const fetchAll = async (status = "") => {
    setLoading(true);
    setError("");
    try {
      const [policiesRes, customersRes] = await Promise.all([
        api.get("/policies", { params: status ? { status } : {} }),
        api.get("/customers"),
      ]);
      setPolicies(policiesRes.data.policies);
      setCustomers(customersRes.data.customers);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load policies");
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
    setEditingId(null);
    setForm({
      customer_id: "",
      policy_type: "",
      premium_amount: "",
      start_date: "",
      end_date: "",
    });
    setShowForm(true);
  };

  const openEditForm = (policy) => {
    setEditingId(policy.id);
    setForm({
      customer_id: policy.customer_id,
      policy_type: policy.policy_type,
      premium_amount: policy.premium_amount,
      start_date: policy.start_date,
      end_date: policy.end_date,
    });
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        const { customer_id, ...updatePayload } = form;
        await api.put(`/policies/${editingId}`, updatePayload);
      } else {
        await api.post("/policies", form);
      }
      setShowForm(false);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save policy");
    }
  };

  const openRenewForm = (policy) => {
    setRenewingId(policy.id);
    setNewEndDate("");
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/policies/${renewingId}/renew`, { new_end_date: newEndDate });
      setRenewingId(null);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to renew policy");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this policy?")) return;
    setError("");
    try {
      await api.post(`/policies/${id}/cancel`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel policy");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this policy? This cannot be undone.")) return;
    setError("");
    try {
      await api.delete(`/policies/${id}`);
      fetchAll(statusFilter);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete policy");
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
            <h1 className="text-2xl font-semibold text-navy-700">Policies</h1>
          </div>
          {canManage && (
            <button
              onClick={openAddForm}
              className="bg-navy-700 text-white px-4 py-2 rounded hover:bg-navy-800 transition"
            >
              + Add Policy
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
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
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
          ) : policies.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No policies found.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="px-4 py-3">Policy #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Premium</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs">{p.policy_number}</td>
                    <td className="px-4 py-3">{customerName(p.customer_id)}</td>
                    <td className="px-4 py-3">{p.policy_type}</td>
                    <td className="px-4 py-3">₹{p.premium_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{formatDate(p.start_date)}</td>
                    <td className="px-4 py-3">{formatDate(p.end_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[p.status] || ""}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 space-x-2 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openEditForm(p)}
                          className="text-teal-600 hover:underline"
                        >
                          Edit
                        </button>
                        {p.status === "active" && (
                          <>
                            <button
                              onClick={() => openRenewForm(p)}
                              className="text-blue-600 hover:underline"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => handleCancel(p.id)}
                              className="text-orange-600 hover:underline"
                            >
                              Cancel
                            </button>
                          </>
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
            <h2 className="text-xl font-semibold text-navy-700 mb-4">
              {editingId ? "Edit Policy" : "Add Policy"}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Customer
                  </label>
                  <select
                    name="customer_id"
                    value={form.customer_id}
                    onChange={handleFormChange}
                    required
                    className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Policy Type
                </label>
                <input
                  type="text"
                  name="policy_type"
                  placeholder="e.g. Health Insurance"
                  value={form.policy_type}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Premium Amount (₹)
                </label>
                <input
                  type="number"
                  name="premium_amount"
                  value={form.premium_amount}
                  onChange={handleFormChange}
                  required
                  min="1"
                  step="0.01"
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
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

      {renewingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h2 className="text-xl font-semibold text-navy-700 mb-4">Renew Policy</h2>
            <form onSubmit={handleRenewSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New End Date
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-navy-700 text-white py-2 rounded hover:bg-navy-800 transition"
                >
                  Renew
                </button>
                <button
                  type="button"
                  onClick={() => setRenewingId(null)}
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

export default Policies;
