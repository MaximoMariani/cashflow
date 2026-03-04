const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const { escenario } = req.query;
    let query = "SELECT * FROM proyecciones WHERE user_id=$1";
    const params = [req.userId];
    if (escenario === "CONFIRMADO" || escenario === "PROBABLE") {
      query += " AND escenario=$2";
      params.push(escenario);
    }
    query += " ORDER BY fecha ASC, created_at ASC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  const { fecha, concepto, tipo, categoria, monto, cuenta, notas, escenario } = req.body;
  if (!fecha || !concepto || !tipo || monto === undefined)
    return res.status(400).json({ error: "Faltan campos" });
  const esc = (escenario === "CONFIRMADO" || escenario === "PROBABLE") ? escenario : "PROBABLE";
  try {
    const { rows } = await pool.query(
      `INSERT INTO proyecciones (user_id, fecha, concepto, tipo, categoria, monto, cuenta, notas, escenario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.userId, fecha, concepto, tipo, categoria || "Otros", parseFloat(monto), cuenta || "", notas || "", esc]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, concepto, tipo, categoria, monto, cuenta, notas, escenario } = req.body;
  const esc = (escenario === "CONFIRMADO" || escenario === "PROBABLE") ? escenario : "PROBABLE";
  try {
    const { rows } = await pool.query(
      `UPDATE proyecciones
       SET fecha=$1, concepto=$2, tipo=$3, categoria=$4, monto=$5, cuenta=$6, notas=$7, escenario=$8
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [fecha, concepto, tipo, categoria || "Otros", parseFloat(monto), cuenta || "", notas || "", esc, id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM proyecciones WHERE id=$1 AND user_id=$2",
      [id, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "No encontrado" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
