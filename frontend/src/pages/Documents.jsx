import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Documents() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canManage = user && (user.role === "admin" || user.role === "agent");

  const customerName = (id) => {
    const c = customers.find((c) => c.id === id);
    return c ? c.name : `#${id}`;
  };

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [docsRes, customersRes] = await Promise.all([
        api.get("/documents"),
        api.get("/customers"),
      ]);
      setDocuments(docsRes.data.documents);
      setCustomers(customersRes.data.customers);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedCustomer || !selectedFile) {
      setError("Please select a customer and a file");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("customer_id", selectedCustomer);
      formData.append("file", selectedFile);
      await api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelectedFile(null);
      setSelectedCustomer("");
      document.getElementById("file-input").value = "";
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id) => {
    setError("");
    const newTab = window.open("", "_blank");
    try {
      const res = await api.get(`/documents/${id}/download`);
      if (newTab) {
        newTab.location.href = res.data.url;
      } else {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      if (newTab) newTab.close();
      setError(err.response?.data?.error || "Failed to get download link");
    }
  };
  

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    setError("");
    try {
      await api.delete(`/documents/${id}`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete document");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-teal-600 hover:underline mb-2"
        >
          &larr; Back to Dashboard
        </button>
        <h1 className="text-2xl font-semibold text-navy-700 mb-6">Documents</h1>

        {canManage && (
          <form
            onSubmit={handleUpload}
            className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-wrap gap-3 items-end"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Customer
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
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
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                File (PDF, image, or Word doc, max 10MB)
              </label>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full text-sm border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="bg-navy-700 text-white px-4 py-2 rounded hover:bg-navy-800 transition disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <p className="p-6 text-slate-500 text-center">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No documents uploaded yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{d.file_name}</td>
                    <td className="px-4 py-3">{customerName(d.customer_id)}</td>
                    <td className="px-4 py-3">{formatDateTime(d.uploaded_at)}</td>
                    <td className="px-4 py-3 space-x-3 text-sm">
                      <button
                        onClick={() => handleDownload(d.id)}
                        className="text-teal-600 hover:underline"
                      >
                        Download
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleDelete(d.id)}
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
    </div>
  );
}

export default Documents;
