const express = require("express");
const router  = express.Router();
const { pool } = require("../db");

const validCerteza = (c) =>
  ["CONFIRMADO", "PROBABLE"].includes((c || "").toUpperCase())
    ? c.toUpperCase()
    : "CONFIRMADO";

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY fecha DESC, created_at DESC",
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  const { fecha, concepto, tipo, categoria, monto, cuenta, certeza } = req.body;
  if (!fecha || !concepto || !tipo || !categoria || monto === undefined || !cuenta)
    return res.status(400).json({ error: "Faltan campos requeridos" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (user_id, fecha, concepto, tipo, categoria, monto, cuenta, certeza)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.userId, fecha, concepto, tipo, categoria, parseFloat(monto), cuenta, validCerteza(certeza)]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, concepto, tipo, categoria, monto, cuenta, certeza } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE transactions
       SET fecha=$1, concepto=$2, tipo=$3, categoria=$4, monto=$5, cuenta=$6, certeza=$7
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [fecha, concepto, tipo, categoria, parseFloat(monto), cuenta, validCerteza(certeza), id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM transactions WHERE id=$1 AND user_id=$2",
      [id, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
