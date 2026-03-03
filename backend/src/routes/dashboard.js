const express = require("express");
const router  = express.Router();
const { pool } = require("../db");

// ── Utilidad: convierte Decimal/string de Postgres a number de forma segura ──
// Nunca devuelve NaN: si el valor no es parseable, devuelve 0.
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ── Período por defecto: mes actual en timezone Argentina (UTC-3) ─────────────
// Si el cliente no envía ?desde=&hasta=, se usa el mes en curso.
// Se trabaja todo en UTC internamente; la comparación de fecha ya es DATE en PG.
function getPeriodo(query) {
  const tz = "America/Argentina/Buenos_Aires"; // UTC-3
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const inicio = query.desde || new Date(year, month, 1).toISOString().slice(0, 10);
  const fin    = query.hasta || new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { inicio, fin };
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
//
// Respuesta exacta según spec:
// {
//   liquidezActual, fondosTotales,
//   obligacionesConfirmadas, obligacionesProbables, obligacionesTotales,
//   saldoConfirmadoConObligaciones, saldoProbableConObligaciones, dineroAFavor,
//   ingresosTotalesPeriodo, egresosTotalesPeriodo,
//   periodo: { inicio, fin, label }
// }
//
// NOTA sobre liquidezActual:
//   Según spec: liquidezActual = Σ cuentas.balance_actual (foto "hoy" del saldo real).
//   La columna balance_actual existe en la tabla cuentas (migración idempotente en db.js).
//   NO se calcula desde transactions para evitar doble conteo: un egreso ejecutado
//   ya está reflejado en balance_actual; si también sumáramos transactions tendríamos
//   el mismo dato dos veces.
//
// Performance: 4 queries paralelas (Promise.all) — sin roundtrips secuenciales.
// ────────────────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const { inicio, fin } = getPeriodo(req.query);

    // Q1: Liquidez actual = Σ cuentas.balance_actual (spec 2.1)
    // Q2: Fondos totales = Σ fondos_inversion.monto
    // Q3: Obligaciones pendientes desglosadas por certeza
    // Q4: Ingresos y egresos del período

    const [q1, q2, q3, q4] = await Promise.all([
      // Q1 — liquidez: Σ cuentas.balance_actual (spec sección 2.1)
      // balance_actual es la foto del saldo real de cada cuenta HOY.
      // Se mantiene desde el módulo Cuentas; no se recalcula desde transactions.
      pool.query(`
        SELECT COALESCE(SUM(balance_actual), 0) AS liquidez_actual
        FROM cuentas
      `),

      // Q2 — fondos
      pool.query(`
        SELECT COALESCE(SUM(monto), 0) AS fondos_totales
        FROM fondos_inversion
      `),

      // Q3 — obligaciones PENDIENTES, desglosadas por certeza
      // Si la columna certeza no existe aún (primera deploy antes de migración),
      // la query fallará; el catch devuelve 500 con mensaje claro.
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN certeza = 'CONFIRMADA' THEN monto ELSE 0 END), 0) AS confirmadas,
          COALESCE(SUM(CASE WHEN certeza = 'PROBABLE'   THEN monto ELSE 0 END), 0) AS probables
        FROM obligaciones
        WHERE estado = 'PENDIENTE'
      `),

      // Q4 — ingresos y egresos del período (mes actual por defecto)
      // tipo='Ingreso' → monto positivo en DB; tipo='Egreso' → monto negativo en DB.
      // ABS() devuelve magnitudes positivas en ambos campos (spec 2.4 y 2.5).
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto       ELSE 0 END), 0) AS ingresos,
          COALESCE(SUM(CASE WHEN tipo = 'Egreso'  THEN ABS(monto)  ELSE 0 END), 0) AS egresos
        FROM transactions
        WHERE fecha >= $1::date AND fecha <= $2::date
      `, [inicio, fin]),
    ]);

    // Extraer valores y convertir a number (Postgres devuelve strings para NUMERIC)
    const liquidezActual           = toNum(q1.rows[0].liquidez_actual);
    const fondosTotales            = toNum(q2.rows[0].fondos_totales);
    const obligacionesConfirmadas  = toNum(q3.rows[0].confirmadas);
    const obligacionesProbables    = toNum(q3.rows[0].probables);
    const obligacionesTotales      = obligacionesConfirmadas + obligacionesProbables;
    const ingresosTotalesPeriodo   = toNum(q4.rows[0].ingresos);
    const egresosTotalesPeriodo    = toNum(q4.rows[0].egresos);

    // Derivados (calculados aquí, no en frontend)
    const saldoConfirmadoConObligaciones = liquidezActual - obligacionesConfirmadas;
    const saldoProbableConObligaciones   = liquidezActual - obligacionesTotales;
    const dineroAFavor                   = liquidezActual + fondosTotales - obligacionesTotales;

    res.json({
      liquidezActual,
      fondosTotales,
      obligacionesConfirmadas,
      obligacionesProbables,
      obligacionesTotales,
      saldoConfirmadoConObligaciones,
      saldoProbableConObligaciones,
      dineroAFavor,
      ingresosTotalesPeriodo,
      egresosTotalesPeriodo,
      periodo: {
        inicio,
        fin,
        label: "Mes actual",
      },
    });
  } catch (err) {
    console.error("[GET /dashboard/summary]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Rutas existentes (sin cambios) ──────────────────────────────────────────

// GET full dashboard state (fondos + config — usado por FondosPage)
router.get("/", async (req, res) => {
  try {
    const config    = await pool.query("SELECT * FROM dashboard_config WHERE id=1");
    const estimados = await pool.query("SELECT * FROM dinero_estimado ORDER BY created_at ASC");
    const fondos    = await pool.query("SELECT * FROM fondos_inversion ORDER BY created_at ASC");
    res.json({
      config: config.rows[0],
      dineroEstimado: estimados.rows,
      fondosInversion: fondos.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update dashboard config
router.put("/config", async (req, res) => {
  const { proveedores, talleres, sueldos_pendientes, oblig_oficinas, dinero_liquidar, saldo_respaldo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE dashboard_config SET
        proveedores=$1, talleres=$2, sueldos_pendientes=$3,
        oblig_oficinas=$4, dinero_liquidar=$5, saldo_respaldo=$6,
        updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [proveedores||0, talleres||0, sueldos_pendientes||0, oblig_oficinas||0, dinero_liquidar||0, saldo_respaldo||0]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST dinero estimado
router.post("/estimado", async (req, res) => {
  const { concepto, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO dinero_estimado (concepto, monto) VALUES ($1,$2) RETURNING *",
      [concepto||"", parseFloat(monto)||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT dinero estimado
router.put("/estimado/:id", async (req, res) => {
  const { id } = req.params;
  const { concepto, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE dinero_estimado SET concepto=$1, monto=$2 WHERE id=$3 RETURNING *",
      [concepto||"", parseFloat(monto)||0, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE dinero estimado
router.delete("/estimado/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM dinero_estimado WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST fondo inversion
router.post("/fondos", async (req, res) => {
  const { nombre, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO fondos_inversion (nombre, monto) VALUES ($1,$2) RETURNING *",
      [nombre||"", parseFloat(monto)||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT fondo inversion
router.put("/fondos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE fondos_inversion SET nombre=$1, monto=$2 WHERE id=$3 RETURNING *",
      [nombre||"", parseFloat(monto)||0, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE fondo inversion
router.delete("/fondos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM fondos_inversion WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
