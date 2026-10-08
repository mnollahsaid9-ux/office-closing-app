OFFICE CLOSING APP V18 — POSTGRESQL ONLINE

Architecture:
Cashier/Admin phone or PC -> HTTPS Web App -> Node.js API -> PostgreSQL

IMPORTANT:
V18 uses PostgreSQL as the central source of truth. Do not rely on local database.json for production accounting data.

Local test:
1. Install Node.js 18+.
2. Set DATABASE_URL to a PostgreSQL connection string.
3. Run: npm install
4. Run: npm start
5. Open: http://localhost:3000
6. Health: http://localhost:3000/health

Default users:
admin / admin123
cashier / cashier123

PRODUCTION / RENDER:
1. Push this folder to a Git repository.
2. In Render create/deploy the Blueprint from render.yaml.
3. It creates a Web Service and Render Postgres database.
4. DATABASE_URL is wired from the Postgres connection string.
5. Confirm /health is OK before giving the URL to cashiers.
6. Change the default passwords before real accounting use.

Note: session login tokens are currently kept in server memory; a server restart logs users out. Data itself is stored in PostgreSQL.
