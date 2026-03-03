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
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok", ts: new Date() }));
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

initDB()
  .then(() => app.listen(PORT, () => console.log(`✅ Server on port ${PORT}`)))
  .catch(err => { console.error("❌ DB init failed:", err); process.exit(1); });
