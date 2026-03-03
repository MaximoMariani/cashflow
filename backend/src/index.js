require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { initDB } = require("./db");

const transactionsRouter = require("./routes/transactions");
const cuentasRouter = require("./routes/cuentas");
const dashboardRouter = require("./routes/dashboard");
const proyeccionesRouter = require("./routes/proyecciones");

const app = express();
// Railway (and most PaaS) assigns a dynamic port via the PORT env var.
// Never hardcode a fixed port in production.
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === "production";

let dbReady = false;
let dbError = null;

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    ts: new Date(),
    db: {
      ready: dbReady,
      // expose only a short message (avoid leaking secrets)
      error: dbError ? String(dbError.message || dbError).slice(0, 200) : null,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    },
  });
});
app.use("/api/transactions", transactionsRouter);
app.use("/api/cuentas", cuentasRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/proyecciones", proyeccionesRouter);

const possibleDistPaths = [
  path.join(__dirname, "../../frontend/dist"),
  path.join(__dirname, "../frontend/dist"),
  path.join(process.cwd(), "frontend/dist"),
];
const distPath = possibleDistPaths.find(p => fs.existsSync(p));

if (isProd && distPath) {
  console.log("📦 Serving frontend from:", distPath);
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
} else if (isProd) {
  console.warn("⚠️  Frontend dist not found. Checked:", possibleDistPaths);
}

// Start the HTTP server first so Railway healthchecks can reach the service.
// DB bootstrapping happens in the background; if DATABASE_URL is missing, we
// keep the service up (healthcheck stays OK) but DB-backed routes will fail.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);

  if (!process.env.DATABASE_URL) {
    dbReady = false;
    dbError = new Error(
      "DATABASE_URL is not set. Add a Postgres plugin in Railway or set DATABASE_URL."
    );
    console.warn(
      "⚠️  DATABASE_URL is not set. The API will not be fully functional until a database is configured."
    );
    return;
  }

  initDB()
    .then(() => {
      dbReady = true;
      dbError = null;
    })
    .catch(err => {
      dbReady = false;
      dbError = err;
      console.error("❌ DB init failed (service will stay up):", err);
    });
});
