# InsureSure — Insurance Management Platform

A full-stack insurance management platform built with Flask, React, and Supabase — featuring AI-powered claim risk scoring and summaries, a full policy application workflow, role-based dashboards, PDF generation, and real-time notifications.

## 🚀 Live Demo

- **Frontend:** [insurance-management-platform-lyart.vercel.app](https://insurance-management-platform-lyart.vercel.app)
- **Backend API:** [insurance-management-platform-qfqn.onrender.com](https://insurance-management-platform-qfqn.onrender.com/api/health)

> Note: the backend is hosted on Render's free tier, which spins down after inactivity — the first request after idle time may take 30–50 seconds to respond.

## ✨ Features

### Core
- **Authentication** — JWT-based login/register with role-based access control (Admin, Agent, Customer); registration validates names contain only letters/spaces (no numbers or symbols)
- **Customer Management** — CRUD operations, scoped so customers only ever see their own record
- **Policy Application Workflow** — customers apply for a policy (type, coverage amount, nominee, duration, medical history); agents/admins review pending applications and approve or reject; approval automatically creates the active Policy record
- **Policy Management** — create, renew, cancel policies; policy certificates as downloadable PDFs with a certificate number, coverage details, and status
- **Premium Payments** — track paid/due/overdue status, mock "Pay Now" flow, downloadable PDF receipts
- **Claims Management** — submit claims, approve/reject workflow, full visual claim progress timeline (Submitted → AI Review → Agent Review → Approved/Rejected)
- **Document Vault** — secure file upload/download via Supabase Storage with signed URLs

### AI-Powered (via Groq)
- **AI Claim Risk Scoring** — automatically scores every submitted claim as Low / Medium / High risk with a reasoning summary
- **AI Claim Summary** — generates a human-readable summary and Approve/Reject/Needs-Review recommendation for agents

### Dashboards & Insights
- **Role-based dashboards** — different views, quick actions, and stats for Admin/Agent vs. Customer, with a time-based greeting
- **Live charts** — policy status, claims by status/risk, monthly premium collection, customer growth (Chart.js)
- **Recent Activity Feed** — real-time feed of policy creations, claim approvals/rejections, and application decisions
- **Global Search** — one search box across customers, policy numbers, and claims
- **In-app Notification Center** — bell icon with unread counts, triggered on policy creation, claim decisions, and application reviews

### Access Control
- Role-based permissions enforced on both frontend and backend
- Customers are scoped to their own policies, claims, payments, applications, and documents — verified at the API level, not just hidden in the UI

## 🛠 Tech Stack

**Backend:** Flask, SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt, Gunicorn
**Frontend:** React (Vite), React Router, Tailwind CSS, Chart.js
**Database & Storage:** Supabase (Postgres + file storage)
**AI:** Groq (Llama 3.3 70B) for claim risk scoring and summaries
**PDF Generation:** ReportLab
**Deployment:** Render (backend), Vercel (frontend)

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — manage customers, policies, payments, claims, applications; delete records |
| **Agent** | Create/manage policies and payments, review policy applications, approve/reject claims |
| **Customer** | Apply for policies, view own policies/claims/payments/documents, submit claims, pay premiums, download certificates & receipts |

## 📦 Project Structure

insurance-management-platform/
├── backend/ # Flask API
│ ├── app.py # App factory, blueprint registration
│ ├── extensions.py # Shared Flask extensions (bcrypt, jwt)
│ ├── config.py # Environment-based configuration
│ ├── models/ # SQLAlchemy models
│ ├── routes/ # API blueprints (auth, customers, policies, policy applications, payments, claims, documents, dashboard, search, receipts, notifications)
│ └── requirements.txt
└── frontend/ # React + Vite app
├── src/
│ ├── pages/ # Route-level components
│ ├── components/ # Shared components (NotificationBell)
│ └── services/ # API client (axios)
└── package.json


## ⚙️ Local Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see `.env.example`):

DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET_KEY=your-secret-key-here
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your-supabase-service-key
SUPABASE_BUCKET=documents
GROQ_API_KEY=your-groq-api-key


Run the server:

```bash
python3 app.py
```

API runs at `http://localhost:5001`.

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/` (optional — defaults to localhost):

VITE_API_URL=http://localhost:5001/api


Run the dev server:

```bash
npm run dev
```

App runs at `http://localhost:5173`.

## 🔐 API Overview

All endpoints are prefixed with `/api`. Key routes:

- `POST /auth/register`, `POST /auth/login` — authentication
- `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`
- `POST /policy-applications`, `GET /policy-applications`, `POST /policy-applications/:id/approve`, `POST /policy-applications/:id/reject`
- `GET/POST /policies`, `POST /policies/:id/renew`, `POST /policies/:id/cancel`
- `GET/POST /payments`, `POST /payments/:id/pay`
- `GET/POST /claims`, `POST /claims/:id/approve`, `POST /claims/:id/reject`, `POST /claims/:id/summary`
- `GET/POST /documents`, `GET /documents/:id/download`
- `GET /dashboard/admin`, `GET /dashboard/customer`
- `GET /search?q=`
- `GET /receipts/payment/:id`, `GET /receipts/policy/:id`
- `GET /notifications`, `POST /notifications/:id/read`

## 📄 License

Built as a personal/academic project.
