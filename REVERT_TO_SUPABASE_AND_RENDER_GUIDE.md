# Revert Guide: Switching back to Supabase Database & Render Live Backend

This document contains step-by-step instructions on how to revert the project back from local PostgreSQL (`arkuniv`) to the production Supabase database and Render backend.

---

## 1. Revert Backend Database (`backend/.env`)

In `backend/.env`:

1. **Uncomment the Supabase `DATABASE_URL`**:
   ```env
   DATABASE_URL=postgresql://postgres.vughtjtbcegwqyzifxtr:Preet%401607%23@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
   ```
2. **Comment out or remove the local `DATABASE_URL`**:
   ```env
   # Local PostgreSQL Database (Commented)
   # DATABASE_URL=postgresql://postgres:Preet%401607@localhost:5432/arkuniv
   ```

---

## 2. Revert Frontend API URL (`frontend/.env.local` & `frontend/next.config.ts`)

### A. In `frontend/.env.local`:
Remove or update `NEXT_PUBLIC_API_URL`:
```env
NEXT_PUBLIC_API_URL=https://ark-university.onrender.com
```

### B. In `frontend/next.config.ts`:
Uncomment the Render URL fallback line:
```typescript
const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://ark-university.onrender.com";
```

---

## 3. Restart Servers
* Restart backend: `uvicorn main:app --reload`
* Restart frontend: `npm run dev`
