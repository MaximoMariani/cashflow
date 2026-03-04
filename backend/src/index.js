require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { initDB } = require("./db");

const transactionsRouter  = require("./routes/transactions");
const cuentasRouter       = require("./routes/cuentas");
const dashboardRouter     = require("./routes/dashboard");
const proyeccionesRouter  = require("./routes/proyecciones");
const obligacionesRouter  = require("./routes/obligaciones");
const settingsRouter      = require("./routes/settings");
const billingRouter       = require("./routes/billing");

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProd = process.env.NODE_ENV === "production";

let dbReady = false;
let dbError = null;

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));

// ⚠️ El webhook de Stripe necesita raw body — debe ir ANTES de express.json()
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok", ts: new Date(),
    db: { ready: dbReady, error: dbError ? String(dbError.message || dbError).slice(0, 200) : null },
  });
});

// ── Middleware: extrae user_id del header x-user-id ──────────────────────────
function requireUser(req, res, next) {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ error: "No autenticado" });
  req.userId = userId;
  next();
}

// ── Middleware: verifica que el usuario tenga acceso (trial o pro) ────────────
async function requireAccess(req, res, next) {
  try {
    const { pool } = require("./db");
    const { rows } = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id=$1 LIMIT 1",
      [req.userId]
    );

    // Sin fila → nuevo usuario, verificar si está en trial (1 día desde registro)
    if (rows.length === 0) {
      // Creamos el trial automáticamente en el primer request
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 1); // 1 día de trial
      await pool.query(`
        INSERT INTO subscriptions (user_id, status, trial_ends_at)
        VALUES ($1, 'trial', $2)
        ON CONFLICT (user_id) DO NOTHING
      `, [req.userId, trialEnd]);
      return next(); // primer acceso siempre permitido
    }

    const sub = rows[0];
    const now  = new Date();

    if (sub.status === "active") return next(); // suscripción activa ✅
    if (sub.status === "trial" && now < new Date(sub.trial_ends_at)) return next(); // trial vigente ✅

    // Trial vencido o cancelado
    return res.status(402).json({
      error: "trial_expired",
      message: "Tu período de prueba venció. Suscribite para continuar.",
    });
  } catch (err) {
    console.error("[requireAccess]", err.message);
    next(); // en caso de error de DB, dejamos pasar para no bloquear
  }
}

// Billing sin requireAccess (el webhook es público, status/checkout necesitan user)
app.use("/api/billing", requireUser, billingRouter);

// Todas las demás rutas: requireUser + requireAccess
app.use("/api/transactions",  requireUser, requireAccess, transactionsRouter);
app.use("/api/cuentas",       requireUser, requireAccess, cuentasRouter);
app.use("/api/dashboard",     requireUser, requireAccess, dashboardRouter);
app.use("/api/proyecciones",  requireUser, requireAccess, proyeccionesRouter);
app.use("/api/obligaciones",  requireUser, requireAccess, obligacionesRouter);
app.use("/api/settings",      requireUser, requireAccess, settingsRouter);

const possibleDistPaths = [
  path.join(__dirname, "../../frontend/dist"),
  path.join(__dirname, "../frontend/dist"),
  path.join(process.cwd(), "frontend/dist"),
];
const distPath = possibleDistPaths.find(p => fs.existsSync(p));
if (isProd && distPath) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️  DATABASE_URL is not set."); return;
  }
  initDB()
    .then(() => { dbReady = true; })
    .catch(err => { dbError = err; console.error("❌ DB init failed:", err); });
});
