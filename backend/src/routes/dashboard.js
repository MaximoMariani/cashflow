const express = require("express");
const router  = express.Router();
const { pool } = require("../db");

// ── Utilidad: Postgres NUMERIC → JS number, nunca NaN ───────────────────────
const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

// ── Período por defecto: mes actual (UTC-3 Argentina) ────────────────────────
function getPeriodo(query) {
  const tz  = "America/Argentina/Buenos_Aires";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const y   = now.getFullYear();
  const m   = now.getMonth(); // 0-based

  const inicio = query.desde || new Date(y, m, 1).toISOString().slice(0, 10);
  const fin    = query.hasta || new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { inicio, fin };
}

// ── GET /api/dashboard/summary ───────────────────────────────────────────────
//
// Fórmulas EXACTAS (no modificar):
//
//   ingresosConfirmados = Σ transactions.monto
//     WHERE tipo='Ingreso' AND certeza='CONFIRMADO' AND fecha ∈ [inicio,fin]
//
//   egresosConfirmados  = Σ ABS(transactions.monto)
//     WHERE tipo='Egreso' AND certeza='CONFIRMADO' AND fecha ∈ [inicio,fin]
//
//   ingresosProbables = Σ transactions.monto (tipo='Ingreso' AND certeza='PROBABLE')
//                     + Σ proyecciones.monto (tipo='Ingreso' AND escenario='PROBABLE')
//     — ambas fuentes dentro del período [inicio, fin]
//
//   CAUSA DEL BUG ANTERIOR: ingresosProbables solo consultaba `transactions`.
//   Los $5M viven en `proyecciones` (tabla de Escenarios), nunca se sumaban.
//
//   obligacionesTotales = Σ obligaciones.monto WHERE estado='PENDIENTE'
//
//   liquidezActual          = ingresosConfirmados − egresosConfirmados
//   liquidezConObligaciones = ingresosConfirmados − egresosConfirmados − obligacionesTotales
//     (obligaciones SIEMPRE restan)
//
// Performance: 3 queries paralelas (Promise.all)
//   Q1: transactions  — ingresos conf + egresos conf + ingresos prob tx
//   Q2: proyecciones  — ingresos prob escenarios
//   Q3: obligaciones  — totales pendientes
//
// Test manual:
//   ingresosConfirmados=2.82M, egresosConfirmados=1.32M,
//   ingresosProbables=5.00M (escenarios), obligacionesTotales=7.30M
//   liquidezActual          = 2.82 − 1.32        =  1.50M  ✓
//   liquidezConObligaciones = 1.50 − 7.30        = −5.80M  ✓
//   ingresosProbables       =        5.00M                 ✓
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const { inicio, fin } = getPeriodo(req.query);

    const [q1, q2, q3] = await Promise.all([
      // Q1 — transactions: ingresos conf, egresos conf, ingresos prob tx (una sola pasada)
      pool.query(`
        SELECT
          COALESCE(SUM(
            CASE WHEN tipo = 'Ingreso' AND certeza = 'CONFIRMADO' THEN monto    ELSE 0 END
          ), 0) AS ingresos_conf,

          COALESCE(SUM(
            CASE WHEN tipo = 'Egreso'  AND certeza = 'CONFIRMADO' THEN ABS(monto) ELSE 0 END
          ), 0) AS egresos_conf,

          COALESCE(SUM(
            CASE WHEN tipo = 'Ingreso' AND certeza = 'PROBABLE'   THEN monto    ELSE 0 END
          ), 0) AS ingresos_prob_tx

        FROM transactions
        WHERE fecha >= $1::date
          AND fecha <= $2::date
      `, [inicio, fin]),

      // Q2 — proyecciones (Escenarios): ingresos probables del período.
      // monto en proyecciones es positivo para ingresos.
      // Solo tipo='Ingreso' AND escenario='PROBABLE' — nunca egresos probables.
      pool.query(`
        SELECT COALESCE(SUM(monto), 0) AS ingresos_prob_esc
        FROM proyecciones
        WHERE tipo      = 'Ingreso'
          AND escenario = 'PROBABLE'
          AND fecha >= $1::date
          AND fecha <= $2::date
      `, [inicio, fin]),

      // Q3 — obligaciones pendientes
      pool.query(`
        SELECT COALESCE(SUM(monto), 0) AS obligaciones_totales
        FROM obligaciones
        WHERE estado = 'PENDIENTE'
      `),
    ]);

    // Extraer como number (Postgres devuelve NUMERIC como string)
    const ingresosConfirmados = toNum(q1.rows[0].ingresos_conf);
    const egresosConfirmados  = toNum(q1.rows[0].egresos_conf);
    const ingresosProbTx      = toNum(q1.rows[0].ingresos_prob_tx);
    const ingresosProbEsc     = toNum(q2.rows[0].ingresos_prob_esc);
    // Total probable = movimientos probables + escenarios probables
    const ingresosProbables   = ingresosProbTx + ingresosProbEsc;
    const obligacionesTotales = toNum(q3.rows[0].obligaciones_totales);

    // Derivados
    const liquidezActual          = ingresosConfirmados - egresosConfirmados;
    const liquidezConObligaciones = ingresosConfirmados - egresosConfirmados - obligacionesTotales;

    res.json({
      periodo: { inicio, fin, label: "Mes actual" },
      ingresosConfirmados,
      egresosConfirmados,
      ingresosProbables,
      obligacionesTotales,
      liquidezActual,
      liquidezConObligaciones,
    });
  } catch (err) {
    console.error("[GET /dashboard/summary]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Rutas existentes (sin cambios) ────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const config    = await pool.query("SELECT * FROM dashboard_config WHERE id=1");
    const estimados = await pool.query("SELECT * FROM dinero_estimado ORDER BY created_at ASC");
    const fondos    = await pool.query("SELECT * FROM fondos_inversion ORDER BY created_at ASC");
    res.json({ config: config.rows[0], dineroEstimado: estimados.rows, fondosInversion: fondos.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/config", async (req, res) => {
  const { proveedores, talleres, sueldos_pendientes, oblig_oficinas, dinero_liquidar, saldo_respaldo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE dashboard_config SET proveedores=$1, talleres=$2, sueldos_pendientes=$3,
       oblig_oficinas=$4, dinero_liquidar=$5, saldo_respaldo=$6, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [proveedores||0, talleres||0, sueldos_pendientes||0, oblig_oficinas||0, dinero_liquidar||0, saldo_respaldo||0]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.delete("/estimado/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM dinero_estimado WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
