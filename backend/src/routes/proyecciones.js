const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET /api/proyecciones?escenario=CONFIRMADO|PROBABLE
router.get("/", async (req, res) => {
  try {
    const { escenario } = req.query;
    let query = "SELECT * FROM proyecciones";
    const params = [];
    if (escenario === "CONFIRMADO" || escenario === "PROBABLE") {
      query += " WHERE escenario = $1";
      params.push(escenario);
    }
    query += " ORDER BY fecha ASC, created_at ASC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/proyecciones
router.post("/", async (req, res) => {
  const { fecha, concepto, tipo, categoria, monto, cuenta, notas, escenario } = req.body;
  if (!fecha || !concepto || !tipo || monto === undefined)
    return res.status(400).json({ error: "Faltan campos" });
  const esc = (escenario === "CONFIRMADO" || escenario === "PROBABLE") ? escenario : "PROBABLE";
  try {
    const { rows } = await pool.query(
      `INSERT INTO proyecciones (fecha, concepto, tipo, categoria, monto, cuenta, notas, escenario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [fecha, concepto, tipo, categoria || "Otros", parseFloat(monto), cuenta || "", notas || "", esc]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/proyecciones/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, concepto, tipo, categoria, monto, cuenta, notas, escenario } = req.body;
  const esc = (escenario === "CONFIRMADO" || escenario === "PROBABLE") ? escenario : "PROBABLE";
  try {
    const { rows } = await pool.query(
      `UPDATE proyecciones
       SET fecha=$1, concepto=$2, tipo=$3, categoria=$4, monto=$5, cuenta=$6, notas=$7, escenario=$8
       WHERE id=$9 RETURNING *`,
      [fecha, concepto, tipo, categoria || "Otros", parseFloat(monto), cuenta || "", notas || "", esc, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/proyecciones/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM proyecciones WHERE id=$1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
