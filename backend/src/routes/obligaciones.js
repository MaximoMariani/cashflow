const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/obligaciones/metricas — debe ir ANTES de /:id
router.get("/metricas", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN estado='PENDIENTE' THEN monto ELSE 0 END), 0) AS total_pendiente,
        COALESCE(SUM(CASE WHEN estado='PENDIENTE'
                          AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days'
                          THEN monto ELSE 0 END), 0) AS a_liquidar_7d,
        COUNT(CASE WHEN estado='PENDIENTE' THEN 1 END)::int AS count_pendiente,
        COUNT(CASE WHEN estado='PAGADA'    THEN 1 END)::int AS count_pagada
      FROM obligaciones
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/obligaciones
router.get("/", async (req, res) => {
  try {
    const { estado, categoria, cuenta, desde, hasta } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;
    if (estado)    { conditions.push(`estado = $${i++}`);             params.push(estado); }
    if (categoria) { conditions.push(`categoria = $${i++}`);          params.push(categoria); }
    if (cuenta)    { conditions.push(`cuenta = $${i++}`);             params.push(cuenta); }
    if (desde)     { conditions.push(`fecha_vencimiento >= $${i++}`); params.push(desde); }
    if (hasta)     { conditions.push(`fecha_vencimiento <= $${i++}`); params.push(hasta); }
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const { rows } = await pool.query(
      `SELECT * FROM obligaciones ${where} ORDER BY fecha_vencimiento ASC, created_at ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obligaciones
router.post("/", async (req, res) => {
  const { fecha_vencimiento, concepto, categoria, cuenta, monto, notas, certeza } = req.body;
  if (!fecha_vencimiento || !concepto || !cuenta || monto === undefined)
    return res.status(400).json({ error: "Campos requeridos: fecha_vencimiento, concepto, cuenta, monto" });
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0)
    return res.status(400).json({ error: "El monto debe ser mayor a 0" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO obligaciones (fecha_vencimiento, concepto, categoria, cuenta, monto, notas, estado, certeza)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDIENTE',$7) RETURNING *`,
      [fecha_vencimiento, concepto, categoria || "Otros", cuenta, montoNum, notas || "", ["CONFIRMADA","PROBABLE"].includes((certeza||"").toUpperCase()) ? certeza.toUpperCase() : "CONFIRMADA"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/obligaciones/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha_vencimiento, concepto, categoria, cuenta, monto, notas, certeza } = req.body;
  if (!fecha_vencimiento || !concepto || !cuenta || monto === undefined)
    return res.status(400).json({ error: "Campos requeridos: fecha_vencimiento, concepto, cuenta, monto" });
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0)
    return res.status(400).json({ error: "El monto debe ser mayor a 0" });
  try {
    const check = await pool.query("SELECT estado FROM obligaciones WHERE id=$1", [id]);
    if (check.rowCount === 0) return res.status(404).json({ error: "Obligación no encontrada" });
    if (check.rows[0].estado === "PAGADA")
      return res.status(400).json({ error: "No se puede editar una obligación ya pagada" });
    // certeza: si llega 'CONFIRMADA' o 'PROBABLE' la usamos; de lo contrario mantenemos la existente.
    // COALESCE(NULLIF($7,''), col_existente) conserva el valor si no se envía nada.
    const certezaVal = ["CONFIRMADA","PROBABLE"].includes((certeza||"").toUpperCase())
      ? certeza.toUpperCase()
      : null; // null → DB mantiene valor actual vía COALESCE
    const { rows } = await pool.query(
      `UPDATE obligaciones
       SET fecha_vencimiento=$1, concepto=$2, categoria=$3, cuenta=$4, monto=$5,
           notas=$6, certeza=COALESCE($7, certeza), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [fecha_vencimiento, concepto, categoria || "Otros", cuenta, montoNum, notas || "", certezaVal, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/obligaciones/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM obligaciones WHERE id=$1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Obligación no encontrada" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/obligaciones/:id/pagar — transaccional
router.post("/:id/pagar", async (req, res) => {
  const { id } = req.params;
  const { fecha_pago } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM obligaciones WHERE id=$1 FOR UPDATE", [id]);
    if (rows.length === 0) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Obligación no encontrada" }); }
    const oblig = rows[0];
    if (oblig.estado === "PAGADA") { await client.query("ROLLBACK"); return res.status(400).json({ error: "Esta obligación ya fue pagada." }); }
    const fechaPago = fecha_pago || new Date().toISOString().slice(0, 10);
    const montoEgreso = -Math.abs(parseFloat(oblig.monto));
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions (fecha, concepto, tipo, categoria, monto, cuenta)
       VALUES ($1,$2,'Egreso',$3,$4,$5) RETURNING *`,
      [fechaPago, oblig.concepto, oblig.categoria, montoEgreso, oblig.cuenta]
    );
    const { rows: updRows } = await client.query(
      `UPDATE obligaciones SET estado='PAGADA', fecha_pago=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [fechaPago, id]
    );
    await client.query("COMMIT");
    res.json({ obligacion: updRows[0], movimiento: txRows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
