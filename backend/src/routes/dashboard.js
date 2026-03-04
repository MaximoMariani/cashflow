const express = require("express");
const router  = express.Router();
const { pool } = require("../db");

const toNum = (v) => { if (v === null || v === undefined) return 0; const n = parseFloat(v); return isNaN(n) ? 0 : n; };

function getPeriodo(query) {
  const tz  = "America/Argentina/Buenos_Aires";
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
  const y = now.getFullYear(), m = now.getMonth();
  const inicio = query.desde || new Date(y, m, 1).toISOString().slice(0, 10);
  const fin    = query.hasta || new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { inicio, fin };
}

router.get("/summary", async (req, res) => {
  try {
    const { inicio, fin } = getPeriodo(req.query);
    const uid = req.userId;

    const [q1, q2, q3] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN tipo='Ingreso' AND certeza='CONFIRMADO' THEN monto    ELSE 0 END),0) AS ingresos_conf,
          COALESCE(SUM(CASE WHEN tipo='Egreso'  AND certeza='CONFIRMADO' THEN ABS(monto) ELSE 0 END),0) AS egresos_conf,
          COALESCE(SUM(CASE WHEN tipo='Ingreso' AND certeza='PROBABLE'   THEN monto    ELSE 0 END),0) AS ingresos_prob_tx
        FROM transactions
        WHERE user_id=$1 AND fecha>=$2::date AND fecha<=$3::date
      `, [uid, inicio, fin]),
      pool.query(`
        SELECT COALESCE(SUM(monto),0) AS ingresos_prob_esc
        FROM proyecciones
        WHERE user_id=$1 AND tipo='Ingreso' AND escenario='PROBABLE' AND fecha>=$2::date AND fecha<=$3::date
      `, [uid, inicio, fin]),
      pool.query(`
        SELECT COALESCE(SUM(monto),0) AS obligaciones_totales
        FROM obligaciones
        WHERE user_id=$1 AND estado='PENDIENTE'
      `, [uid]),
    ]);

    const ingresosConfirmados = toNum(q1.rows[0].ingresos_conf);
    const egresosConfirmados  = toNum(q1.rows[0].egresos_conf);
    const ingresosProbables   = toNum(q1.rows[0].ingresos_prob_tx) + toNum(q2.rows[0].ingresos_prob_esc);
    const obligacionesTotales = toNum(q3.rows[0].obligaciones_totales);
    const liquidezActual          = ingresosConfirmados - egresosConfirmados;
    const liquidezConObligaciones = ingresosConfirmados - egresosConfirmados - obligacionesTotales;

    res.json({ periodo: { inicio, fin, label: "Mes actual" }, ingresosConfirmados, egresosConfirmados, ingresosProbables, obligacionesTotales, liquidezActual, liquidezConObligaciones });
  } catch (err) { console.error("[GET /dashboard/summary]", err.message); res.status(500).json({ error: err.message }); }
});

router.get("/", async (req, res) => {
  const uid = req.userId;
  try {
    const configId = `config_${uid}`;
    // Ensure row exists for this user
    await pool.query(
      `INSERT INTO dashboard_config (id, user_id) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`,
      [configId, uid]
    );
    const config    = await pool.query("SELECT * FROM dashboard_config WHERE id=$1", [configId]);
    const estimados = await pool.query("SELECT * FROM dinero_estimado WHERE user_id=$1 ORDER BY created_at ASC", [uid]);
    const fondos    = await pool.query("SELECT * FROM fondos_inversion WHERE user_id=$1 ORDER BY created_at ASC", [uid]);
    res.json({ config: config.rows[0], dineroEstimado: estimados.rows, fondosInversion: fondos.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/config", async (req, res) => {
  const { proveedores, talleres, sueldos_pendientes, oblig_oficinas, dinero_liquidar, saldo_respaldo } = req.body;
  const uid = req.userId;
  const configId = `config_${uid}`;
  try {
    await pool.query(
      `INSERT INTO dashboard_config (id, user_id) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING`,
      [configId, uid]
    );
    const { rows } = await pool.query(
      `UPDATE dashboard_config SET proveedores=$1, talleres=$2, sueldos_pendientes=$3,
       oblig_oficinas=$4, dinero_liquidar=$5, saldo_respaldo=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [proveedores||0, talleres||0, sueldos_pendientes||0, oblig_oficinas||0, dinero_liquidar||0, saldo_respaldo||0, configId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/estimado", async (req, res) => {
  const { concepto, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO dinero_estimado (user_id, concepto, monto) VALUES ($1,$2,$3) RETURNING *",
      [req.userId, concepto||"", parseFloat(monto)||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/estimado/:id", async (req, res) => {
  const { id } = req.params;
  const { concepto, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE dinero_estimado SET concepto=$1, monto=$2 WHERE id=$3 AND user_id=$4 RETURNING *",
      [concepto||"", parseFloat(monto)||0, id, req.userId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/estimado/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM dinero_estimado WHERE id=$1 AND user_id=$2", [id, req.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/fondos", async (req, res) => {
  const { nombre, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO fondos_inversion (user_id, nombre, monto) VALUES ($1,$2,$3) RETURNING *",
      [req.userId, nombre||"", parseFloat(monto)||0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/fondos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, monto } = req.body;
  try {
    const { rows } = await pool.query(
      "UPDATE fondos_inversion SET nombre=$1, monto=$2 WHERE id=$3 AND user_id=$4 RETURNING *",
      [nombre||"", parseFloat(monto)||0, id, req.userId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/fondos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM fondos_inversion WHERE id=$1 AND user_id=$2", [id, req.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
