import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import NotificationBell from "../components/NotificationBell";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className="text-2xl font-semibold text-navy-700 mt-1">{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ActivityFeed() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/notifications")
      .then((res) => setActivity(res.data.notifications))
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <h2 className="text-sm font-semibold text-slate-600 mb-3">Recent Activity</h2>
      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : activity.length === 0 ? (
        <p className="text-slate-400 text-sm">No recent activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {activity.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-sm">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
              <div>
                <p className="text-slate-700">{a.message}</p>
                <p className="text-xs text-slate-400">{timeAgo(a.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .get("/search", { params: { q: query } })
        .then((res) => setResults(res.data))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results &&
    (results.customers.length || results.policies.length || results.claims.length);

  return (
    <div className="bg-white rounded-lg shadow-md p-5 mb-6">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search customers, policy numbers, claims..."
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {loading && <p className="text-slate-400 text-xs mt-2">Searching...</p>}
      {results && !loading && !hasResults && query.trim().length >= 2 && (
        <p className="text-slate-400 text-xs mt-2">No matches found</p>
      )}
      {hasResults && (
        <div className="mt-3 space-y-3">
          {results.customers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Customers</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {results.customers.map((c) => (
                  <li key={`cust-${c.id}`}>
                    {c.name} — {c.phone || c.email || "no contact"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {results.policies.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Policies</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {results.policies.map((p) => (
                  <li key={`pol-${p.id}`}>
                    {p.policy_number} — {p.policy_type} ({p.status})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {results.claims.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Claims</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {results.claims.map((c) => (
                  <li key={`claim-${c.id}`}>
                    {c.reason} — ₹{c.claim_amount.toLocaleString()} ({c.status})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ data }) {
  const policyDoughnut = {
    labels: ["Active", "Expired", "Cancelled"],
    datasets: [
      {
        data: [data.policies.active, data.policies.expired, data.policies.cancelled],
        backgroundColor: ["#0d9488", "#f59e0b", "#dc2626"],
      },
    ],
  };

  const claimStatusBar = {
    labels: ["Pending", "Approved", "Rejected"],
    datasets: [
      {
        label: "Claims",
        data: [
          data.claims.byStatus.pending,
          data.claims.byStatus.approved,
          data.claims.byStatus.rejected,
        ],
        backgroundColor: ["#f59e0b", "#0d9488", "#dc2626"],
      },
    ],
  };

  const claimRiskBar = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        label: "Claims by Risk",
        data: [data.claims.byRisk.Low, data.claims.byRisk.Medium, data.claims.byRisk.High],
        backgroundColor: ["#0d9488", "#f59e0b", "#dc2626"],
      },
    ],
  };

  const monthlyPremiumLine = {
    labels: data.premiums.monthly.map((m) => m.month),
    datasets: [
      {
        label: "Premiums Collected",
        data: data.premiums.monthly.map((m) => m.amount),
        borderColor: "#0d9488",
        backgroundColor: "rgba(13,148,136,0.2)",
        tension: 0.3,
      },
    ],
  };

  const customerGrowthLine = {
    labels: data.customers.growth.map((m) => m.month),
    datasets: [
      {
        label: "New Customers",
        data: data.customers.growth.map((m) => m.count),
        borderColor: "#1e3a8a",
        backgroundColor: "rgba(30,58,138,0.2)",
        tension: 0.3,
      },
    ],
  };

  return (
    <>
      <GlobalSearch />
      <div className="mb-6">
        <ActivityFeed />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Policies" value={data.policies.total} />
        <StatCard
          label="Premiums Collected"
          value={`₹${data.premiums.totalCollected.toLocaleString()}`}
        />
        <StatCard
          label="Premiums Due"
          value={`₹${data.premiums.totalDue.toLocaleString()}`}
          sub={`Overdue: ₹${data.premiums.totalOverdue.toLocaleString()}`}
        />
        <StatCard label="Total Customers" value={data.customers.total} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Policy Status</h2>
          <Doughnut data={policyDoughnut} />
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Claims by Status</h2>
          <Bar data={claimStatusBar} />
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Claims by Risk Level</h2>
          <Bar data={claimRiskBar} />
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Customer Growth (6mo)</h2>
          <Line data={customerGrowthLine} />
        </div>
        <div className="bg-white rounded-lg shadow-md p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">
            Monthly Premiums Collected (6mo)
          </h2>
          <Line data={monthlyPremiumLine} />
        </div>
      </div>
    </>
  );
}

function CustomerDashboard({ data }) {
  return (
    <>
      <div className="mb-6">
        <ActivityFeed />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Policies" value={data.policies.total} />
        <StatCard label="Active Policies" value={data.policies.active} />
        <StatCard label="Premiums Paid" value={`₹${data.premiums.totalPaid.toLocaleString()}`} />
        <StatCard label="Premiums Due" value={`₹${data.premiums.totalDue.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Claims Overview</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>Pending: {data.claims.pending}</li>
            <li>Approved: {data.claims.approved}</li>
            <li>Rejected: {data.claims.rejected}</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Upcoming Expiries (30d)</h2>
          {data.upcomingExpiries.length === 0 ? (
            <p className="text-slate-400 text-sm">None upcoming</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-700">
              {data.upcomingExpiries.map((p) => (
                <li key={p.policy_number}>
                  {p.policy_number} — {p.days_left} days left
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  useEffect(() => {
    if (!user) return;
    const endpoint = user.role === "customer" ? "/dashboard/customer" : "/dashboard/admin";
    api
      .get(endpoint)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load dashboard"));
  }, [user]);

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FFFC] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-navy-700">
              {getGreeting()}, {user.name} 👋
            </h1>
            <p className="text-slate-500 text-sm">
              <span className="capitalize">{user.role}</span> dashboard
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 space-x-4">
          {user.role !== "customer" && (
            <Link to="/customers" className="text-teal-600 hover:underline text-sm">
              View Customers &rarr;
            </Link>
          )}
          <Link to="/policies" className="text-teal-600 hover:underline text-sm">
            View Policies &rarr;
          </Link>
          <Link to="/payments" className="text-teal-600 hover:underline text-sm">
            View Payments &rarr;
          </Link>
          <Link to="/claims" className="text-teal-600 hover:underline text-sm">
            View Claims &rarr;
          </Link>
          <Link to="/documents" className="text-teal-600 hover:underline text-sm">
            View Documents &rarr;
          </Link>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {!data && !error && <p className="text-slate-500">Loading dashboard...</p>}

        {data &&
          (user.role === "customer" ? (
            <CustomerDashboard data={data} />
          ) : (
            <AdminDashboard data={data} />
          ))}
      </div>
    </div>
  );
}

export default Dashboard;
