const express = require("express");
const router = express.Router();
const { pool } = require("../db");

// GET full dashboard state
router.get("/", async (req, res) => {
  try {
    const config = await pool.query("SELECT * FROM dashboard_config WHERE id=1");
    const estimados = await pool.query("SELECT * FROM dinero_estimado ORDER BY created_at ASC");
    const fondos = await pool.query("SELECT * FROM fondos_inversion ORDER BY created_at ASC");
    res.json({
      config: config.rows[0],
      dineroEstimado: estimados.rows,
      fondosInversion: fondos.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update dashboard config
router.put("/config", async (req, res) => {
  const { proveedores, talleres, sueldos_pendientes, oblig_oficinas, dinero_liquidar, saldo_respaldo } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE dashboard_config SET
        proveedores=$1, talleres=$2, sueldos_pendientes=$3,
        oblig_oficinas=$4, dinero_liquidar=$5, saldo_respaldo=$6,
        updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [proveedores||0, talleres||0, sueldos_pendientes||0, oblig_oficinas||0, dinero_liquidar||0, saldo_respaldo||0]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST dinero estimado
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

// PUT dinero estimado
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

// DELETE dinero estimado
router.delete("/estimado/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM dinero_estimado WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST fondo inversion
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

// PUT fondo inversion
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

// DELETE fondo inversion
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
