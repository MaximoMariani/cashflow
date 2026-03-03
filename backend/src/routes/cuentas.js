const express = require("express");
const router  = express.Router();
const { pool } = require("../db");

// GET /api/cuentas — devuelve todas las cuentas incluyendo balance_actual
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cuentas ORDER BY created_at ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cuentas — crea cuenta; balance_actual opcional (default 0)
router.post("/", async (req, res) => {
  const { nombre, balance_actual } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  const bal = parseFloat(balance_actual) || 0;
  try {
    const { rows } = await pool.query(
      "INSERT INTO cuentas (nombre, balance_actual) VALUES ($1,$2) RETURNING *",
      [nombre.trim(), bal]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Cuenta ya existe" });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/cuentas/:id/balance — actualiza solo balance_actual
// Endpoint dedicado para que el módulo Cuentas actualice el saldo real.
// Usar PATCH (no PUT) porque solo toca un campo.
router.patch("/:id/balance", async (req, res) => {
  const { id } = req.params;
  const { balance_actual } = req.body;
  if (balance_actual === undefined || balance_actual === null)
    return res.status(400).json({ error: "balance_actual requerido" });
  const bal = parseFloat(balance_actual);
  if (isNaN(bal)) return res.status(400).json({ error: "balance_actual debe ser un número" });
  try {
    const { rows, rowCount } = await pool.query(
      "UPDATE cuentas SET balance_actual=$1 WHERE id=$2 RETURNING *",
      [bal, id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Cuenta no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cuentas/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM cuentas WHERE id=$1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
