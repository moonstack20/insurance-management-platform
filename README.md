# Insurance Management Platform

## Day 1 setup checklist

### 1. Supabase (database + storage)
1. Create a free project at https://supabase.com
2. Project Settings → Database → copy the connection string (URI) into `backend/.env` as `DATABASE_URL`
3. Project Settings → API → copy `Project URL` and `anon` key into `backend/.env` as `SUPABASE_URL` / `SUPABASE_KEY`
4. Storage → New bucket → name it `documents` (used in the Document module, Day 7-8)
5. (Optional) Paste `supabase_schema.sql` into the SQL Editor to pre-create tables — otherwise `db.create_all()` does it automatically on first run

### 2. Groq (AI claim risk scoring, used Day 7)
1. Sign up free at https://console.groq.com — no card required
2. Create an API key, put it in `backend/.env` as `GROQ_API_KEY`

### 3. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # then fill in real values
python app.py
```
Visit http://localhost:5000/api/health — should return `{"status": "ok"}`

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit http://localhost:5173

## Folder structure
```
insurance-management-platform/
├── backend/
│   ├── app.py            # Flask app factory
│   ├── config.py         # env-based config
│   ├── models/           # SQLAlchemy models (User, Customer, Policy, Claim, PremiumPayment, Document)
│   └── routes/           # blueprints, added module by module
├── frontend/
│   └── src/
│       ├── pages/        # one page per module
│       ├── components/   # shared UI
│       ├── context/      # auth/role context (Day 2)
│       └── services/     # api.js — axios instance
└── supabase_schema.sql
```

## Build order (matches the 14-day schedule)
Day 1 Setup → Day 2 Auth → Day 3 Customers → Day 4 Policies → Day 5 Premiums → Day 6 Claims + AI risk scoring → Day 7 Documents → Day 8 Dashboard → Day 9 Search/Filters → Day 10 Deploy
