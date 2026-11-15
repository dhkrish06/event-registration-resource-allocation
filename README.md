# Event Registration and Resource Allocation Management System

DBMS Experiential Learning – Level 3 Project (PES University)
Team: Dhawal Pathak (PES1UG24CS151) and D Harikrishnan (PES1UG24CS136), Class 5C

A Next.js web app for managing campus events: students register (with automatic waitlisting),
organizers create events and allocate resources (projectors, chairs, etc.), and admins manage venues,
resources and reports.

**Databases:** PostgreSQL (events, students, registrations, resources – relational data with integrity rules)
and MongoDB (feedback + activity logs – flexible, document-style data).

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ and MongoDB 6+ (or run `docker compose up -d` to start both)

## Setup
```bash
npm install
cp .env.example .env.local      # then edit values (DB URLs, JWT_SECRET, passwords)
npm run db:init                 # creates tables, triggers, views, sample data, users, Mongo indexes
npm run dev                     # http://localhost:3000
```
`npm run db:init` drops and recreates all tables – use it only for a fresh setup.

## Demo logins (created by db:init)
| Role      | Email               | Password                         |
|-----------|---------------------|----------------------------------|
| Admin     | admin@event.local   | ADMIN_PASSWORD from .env.local   |
| Organizer | anita.rao@pes.edu   | DEMO_PASSWORD from .env.local    |
| Student   | dhawal@pes.edu      | DEMO_PASSWORD from .env.local    |

## Project structure
```
db/schema.sql, db/seed.sql    PostgreSQL DDL (tables, indexes, triggers, function, views) and sample data
scripts/init-db.js            Runs SQL files, creates users (bcrypt hashed), creates Mongo indexes
lib/                          db/mongo connections, JWT auth + role guard, error mapping
app/api/                      Route Handlers (backend API)
app/                          Next.js pages (dashboard, event detail, resources, venues, reports ...)
middleware.js                 Redirects unauthenticated users to /login
```

## Features mapped to requirements
- Roles: admin, organizer, student (JWT in httpOnly cookie, bcrypt password hashes)
- DDL: CREATE / ALTER / DROP, PK, FK, CHECK, UNIQUE, indexes, views
- DML: INSERT / UPDATE / DELETE / SELECT with JOIN, GROUP BY, HAVING, ORDER BY, subqueries
- Advanced: transactions, triggers, stored function, views, indexing, full-text search, MongoDB aggregation
- Config via environment variables; no secrets in source code
