const express = require("express");
const router  = express.Router();
const { pool } = require("../db");

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM cuentas WHERE user_id=$1 ORDER BY created_at ASC",
      [req.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/", async (req, res) => {
  const { nombre, balance_actual } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  const bal = parseFloat(balance_actual) || 0;
  try {
    const { rows } = await pool.query(
      "INSERT INTO cuentas (user_id, nombre, balance_actual) VALUES ($1,$2,$3) RETURNING *",
      [req.userId, nombre.trim(), bal]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Cuenta ya existe" });
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/balance", async (req, res) => {
  const { id } = req.params;
  const { balance_actual } = req.body;
  if (balance_actual === undefined || balance_actual === null)
    return res.status(400).json({ error: "balance_actual requerido" });
  const bal = parseFloat(balance_actual);
  if (isNaN(bal)) return res.status(400).json({ error: "balance_actual debe ser un número" });
  try {
    const { rows, rowCount } = await pool.query(
      "UPDATE cuentas SET balance_actual=$1 WHERE id=$2 AND user_id=$3 RETURNING *",
      [bal, id, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Cuenta no encontrada" });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM cuentas WHERE id=$1 AND user_id=$2",
      [id, req.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
