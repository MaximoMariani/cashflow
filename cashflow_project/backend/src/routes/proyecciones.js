const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM proyecciones ORDER BY fecha ASC, created_at ASC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  const { fecha, concepto, tipo, categoria, monto, cuenta, notas } = req.body;
  if (!fecha || !concepto || !tipo || monto === undefined) return res.status(400).json({ error: "Faltan campos" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO proyecciones (fecha, concepto, tipo, categoria, monto, cuenta, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fecha, concepto, tipo, categoria || "Otros", parseFloat(monto), cuenta || "", notas || ""]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, concepto, tipo, categoria, monto, cuenta, notas } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE proyecciones SET fecha=$1, concepto=$2, tipo=$3, categoria=$4, monto=$5, cuenta=$6, notas=$7
       WHERE id=$8 RETURNING *`,
      [fecha, concepto, tipo, categoria || "Otros", parseFloat(monto), cuenta || "", notas || "", id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM proyecciones WHERE id=$1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
