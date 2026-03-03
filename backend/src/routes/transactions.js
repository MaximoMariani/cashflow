const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET all transactions
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM transactions ORDER BY fecha DESC, created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create transaction
router.post("/", async (req, res) => {
  const { fecha, concepto, tipo, categoria, monto, cuenta } = req.body;
  if (!fecha || !concepto || !tipo || !categoria || monto === undefined || !cuenta) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (fecha, concepto, tipo, categoria, monto, cuenta)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [fecha, concepto, tipo, categoria, parseFloat(monto), cuenta]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update transaction
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, concepto, tipo, categoria, monto, cuenta } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE transactions SET fecha=$1, concepto=$2, tipo=$3, categoria=$4, monto=$5, cuenta=$6
       WHERE id=$7 RETURNING *`,
      [fecha, concepto, tipo, categoria, parseFloat(monto), cuenta, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE transaction
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM transactions WHERE id=$1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
