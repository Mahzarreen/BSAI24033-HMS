# ADBMS Hospital Management System

A complete web-based **Hospital Management System** built for an **Advanced Database Management System (ADBMS)** project. It follows the uploaded proposal for BSAI24033 and includes authentication, patient management, appointment scheduling with double-booking prevention, doctor dashboard, lab management, billing, search/filtering, and administration reporting.

## Main ADBMS Features Included

* Normalized relational database design with strong relationships.
* Role-based users: `admin`, `doctor`, `staff`.
* Primary keys, foreign keys, unique constraints, and check constraints.
* Appointment double-booking prevention using a database-level exclusion constraint.
* PostgreSQL triggers for `updated_at`, billing recalculation, audit logs, and lab-result bill item generation.
* Views for dashboard and reporting.
* Indexes for search and performance.
* Transactions for appointment creation and billing operations.
* Audit log table to show data-change tracking.
* Server-side search and filtering for patients, doctors, appointments, lab requests, and bills.

## Default Demo Accounts

After first deployment/database initialization:

| Role   | Email                                       | Password   |
| ------ | ------------------------------------------- | ---------- |
| Admin  | [admin@hms.local](mailto:admin@hms.local)   | Admin@123  |
| Doctor | [doctor@hms.local](mailto:doctor@hms.local) | Doctor@123 |
| Staff  | [staff@hms.local](mailto:staff@hms.local)   | Staff@123  |

Change these passwords after deployment.

---

# Local Setup Using pgAdmin 4

We ran this project locally using **Node.js**, **PostgreSQL**, and **pgAdmin 4**.

## Step 1: Install Required Software

Install the following software first:

* Node.js 18 or later
* PostgreSQL
* pgAdmin 4
* Visual Studio Code or any code editor

## Step 2: Open pgAdmin 4

1. Open **pgAdmin 4** from your computer.
2. Enter the master password that you created during PostgreSQL installation.
3. In the left sidebar, expand:

```text
Servers → PostgreSQL
```

4. If it asks for the PostgreSQL password, enter the password you created while installing PostgreSQL.

## Step 3: Create the Database in pgAdmin 4

1. Right-click on **Databases**.
2. Click:

```text
Create → Database
```

3. In the database name field, write:

```text
hms_adbms
```

4. Keep the owner as:

```text
postgres
```

5. Click **Save**.

Now the database `hms_adbms` is created locally.

## Step 4: Open the Project Folder

Open the project folder in VS Code.

Then open the terminal inside VS Code.

## Step 5: Create the Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows, if the above command does not work, create a new file manually named:

```text
.env
```

Then add this inside the `.env` file:

```env
DATABASE_URL=postgres://postgres:your_postgres_password@localhost:5432/hms_adbms
SESSION_SECRET=your_random_secret_key
NODE_ENV=development
PORT=3000
```

Replace:

```text
your_postgres_password
```

with your actual PostgreSQL password.

Example:

```env
DATABASE_URL=postgres://postgres:12345@localhost:5432/hms_adbms
SESSION_SECRET=my_hospital_secret_key
NODE_ENV=development
PORT=3000
```

Important: If your PostgreSQL password contains special characters like `@`, `#`, `%`, or spaces, use a simple password or encode the password properly in the database URL.

## Step 6: Install Dependencies

Run:

```bash
npm install
```

This will install all required Node.js packages.

## Step 7: Initialize Database Tables and Seed Data

Run:

```bash
npm run db:init
```

This command creates all tables, triggers, views, constraints, indexes, and demo records in the PostgreSQL database.

## Step 8: Start the Project

Run:

```bash
npm start
```

The app will start on:

```text
http://localhost:3000
```

Open this link in your browser.

## Step 9: Login to the System

Use any of the following demo accounts:

| Role   | Email                                       | Password   |
| ------ | ------------------------------------------- | ---------- |
| Admin  | [admin@hms.local](mailto:admin@hms.local)   | Admin@123  |
| Doctor | [doctor@hms.local](mailto:doctor@hms.local) | Doctor@123 |
| Staff  | [staff@hms.local](mailto:staff@hms.local)   | Staff@123  |

---

# Quick Local Run Commands

```bash
npm install
npm run db:init
npm start
```

Open:

```text
http://localhost:3000
```

---

# Deploy on Render

## Option A: Blueprint Deploy

1. Push this folder to GitHub.
2. Go to the Render dashboard.
3. Select:

```text
New + → Blueprint
```

4. Choose the repository.
5. Render will read `render.yaml`, create the web service, and create the PostgreSQL database.
6. The build command will run:

```bash
npm install && npm run db:init
```

7. Open the Render URL and login using the default accounts above.

## Option B: Manual Deploy

1. Create a PostgreSQL database on Render.
2. Create a Web Service connected to your GitHub repository.
3. Add these environment variables:

```env
DATABASE_URL=Render PostgreSQL internal connection string
SESSION_SECRET=any_long_random_string
NODE_ENV=production
```

4. Add this build command:

```bash
npm install && npm run db:init
```

5. Add this start command:

```bash
npm start
```

---

# Project Structure

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
.env.example
README.md
```

---

# ADBMS Viva / Presentation Points

## Why PostgreSQL?

PostgreSQL is used because it supports advanced database features such as constraints, triggers, views, functions, indexes, transactions, and exclusion constraints. These features are suitable for an ADBMS-level project.

## How is double booking prevented?

Appointment double booking is prevented at the database level using an exclusion constraint on doctor and appointment time range. This means even if two staff users submit conflicting appointments at the same time, PostgreSQL blocks the duplicate booking.

## How is data consistency maintained?

Data consistency is maintained using:

* Foreign keys
* Primary keys
* Unique constraints
* Check constraints
* Transactions
* Trigger-based bill recalculation

## How is performance improved?

Performance is improved using indexes on commonly searched fields such as:

* Patient name
* Patient contact
* Appointment date
* Doctor ID
* Lab status
* Billing status

## How does auditing work?

Audit logs are created through triggers. When important insert, update, or delete actions happen, the system records them in the `audit_logs` table.

---

# Notes

This app is educational but deployable. For real hospital production use, add HTTPS-only cookies, stronger password policy, regular backups, encryption for sensitive patient records, consent tracking, role-based access hardening, and healthcare compliance controls.