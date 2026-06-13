# ADBMS Hospital Management System

A complete web-based **Hospital Management System** built for an **Advanced Database Management System (ADBMS)** project. It follows the uploaded proposal for BSAI24033: authentication, patient management, appointment scheduling with double-booking prevention, doctor dashboard, lab management, billing, search/filtering, and administration reporting.

## Main ADBMS Features Included

- Normalized relational database design with strong relationships.
- Role based users: `admin`, `doctor`, `staff`.
- Primary keys, foreign keys, unique constraints, check constraints.
- Appointment double-booking prevention using database-level exclusion constraint.
- PostgreSQL triggers for `updated_at`, billing recalculation, audit logs, and lab-result bill item generation.
- Views for dashboard/reporting.
- Indexes for search and performance.
- Transactions for appointment creation and billing operations.
- Audit log table to show data-change tracking.
- Server-side search and filtering for patients, doctors, appointments, lab requests and bills.

## Default Demo Accounts

After first deployment/database init:

| Role | Email | Password |
|---|---|---|
| Admin | admin@hms.local | Admin@123 |
| Doctor | doctor@hms.local | Doctor@123 |
| Staff | staff@hms.local | Staff@123 |

Change these passwords after deployment.

## Local Setup

1. Install Node.js 18+ and PostgreSQL.
2. Create a PostgreSQL database:

```bash
createdb hms_adbms
```

3. Copy environment file:

```bash
cp .env.example .env
```

4. Update `DATABASE_URL` inside `.env`.
5. Install dependencies:

```bash
npm install
```

6. Initialize schema and seed data:

```bash
npm run db:init
```

7. Start the app:

```bash
npm start
```

Open: `http://localhost:3000`

## Deploy on Render

### Option A: Blueprint Deploy

1. Push this folder to GitHub.
2. Go to Render dashboard.
3. Select **New +** → **Blueprint**.
4. Choose the repository.
5. Render will read `render.yaml`, create the web service and PostgreSQL database.
6. Build command will run `npm install && npm run db:init`.
7. Open the Render URL and login using the default accounts above.

### Option B: Manual Deploy

1. Create a PostgreSQL database on Render.
2. Create a Web Service connected to your GitHub repo.
3. Add environment variables:
   - `DATABASE_URL` from Render PostgreSQL internal connection string.
   - `SESSION_SECRET` as any long random string.
   - `NODE_ENV=production`
4. Build command:

```bash
npm install && npm run db:init
```

5. Start command:

```bash
npm start
```

## Project Structure

```text
src/
  db/
    pool.js
    init.js
    seed.js
  routes/
    auth.js
    dashboard.js
    patients.js
    appointments.js
    lab.js
    billing.js
    admin.js
  middleware.js
  server.js
sql/
  schema.sql
views/
  *.ejs
public/
  css/style.css
render.yaml
package.json
```

## ADBMS Viva / Presentation Points

- **Why PostgreSQL?** It supports advanced constraints, triggers, views, functions, indexes and transactions suitable for ADBMS.
- **How double booking is prevented?** At database level using an exclusion constraint on doctor/time-range, so even if two staff users submit at the same time, the database blocks conflicting slots.
- **How data consistency is maintained?** Foreign keys, `CHECK` constraints, transactions, and trigger-based bill recalculation.
- **How performance is improved?** Search indexes on patient name/contact, appointments by date/doctor, lab status, billing status.
- **How auditing works?** Trigger writes important insert/update/delete events to `audit_logs`.

## Notes

This app is educational but deployable. For real hospital production use, add HTTPS-only cookies, stronger password policy, backups, encryption for sensitive patient records, consent tracking, and compliance controls.
