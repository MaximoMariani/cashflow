const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    // ── Tablas base ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cuentas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso')),
        categoria VARCHAR(100) NOT NULL,
        monto NUMERIC(15,2) NOT NULL,
        cuenta VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS proyecciones (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso')),
        categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
        monto NUMERIC(15,2) NOT NULL,
        cuenta VARCHAR(100) DEFAULT '',
        notas TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dashboard_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        proveedores NUMERIC(15,2) DEFAULT 0,
        talleres NUMERIC(15,2) DEFAULT 0,
        sueldos_pendientes NUMERIC(15,2) DEFAULT 0,
        oblig_oficinas NUMERIC(15,2) DEFAULT 0,
        dinero_liquidar NUMERIC(15,2) DEFAULT 0,
        saldo_respaldo NUMERIC(15,2) DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dinero_estimado (
        id SERIAL PRIMARY KEY,
        concepto VARCHAR(255),
        monto NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS fondos_inversion (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255),
        monto NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS obligaciones (
        id SERIAL PRIMARY KEY,
        fecha_vencimiento DATE NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
        cuenta VARCHAR(100) NOT NULL,
        monto NUMERIC(15,2) NOT NULL CHECK (monto > 0),
        notas TEXT DEFAULT '',
        estado VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADA')),
        fecha_pago DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── Migración: columna escenario en proyecciones ──────────────────────
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'proyecciones' AND column_name = 'escenario'
        ) THEN
          ALTER TABLE proyecciones
            ADD COLUMN escenario VARCHAR(10) NOT NULL DEFAULT 'PROBABLE';
          ALTER TABLE proyecciones
            ADD CONSTRAINT proyecciones_escenario_check
            CHECK (escenario IN ('CONFIRMADO','PROBABLE'));
        END IF;
      END$$;
    `);

    // ── Migración: tabla financial_settings ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_settings (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL DEFAULT 'default',
        umbral_verde NUMERIC(15,2) NOT NULL DEFAULT 1000000,
        umbral_amarillo NUMERIC(15,2) NOT NULL DEFAULT 200000,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Inserta row por defecto si no existe
    await client.query(`
      INSERT INTO financial_settings (id, user_id, umbral_verde, umbral_amarillo)
      VALUES ('default', 'default', 1000000, 200000)
      ON CONFLICT (id) DO NOTHING;
    `);

    // ── Seeds ─────────────────────────────────────────────────────────────
    const { rowCount } = await client.query("SELECT 1 FROM cuentas LIMIT 1");
    if (rowCount === 0) {
      await client.query(`INSERT INTO cuentas (nombre) VALUES ('MercadoPago Manuel') ON CONFLICT DO NOTHING`);
    }
    await client.query(`INSERT INTO dashboard_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

    const { rowCount: txCount } = await client.query("SELECT 1 FROM transactions LIMIT 1");
    if (txCount === 0) {
      await client.query(`
        INSERT INTO transactions (fecha, concepto, tipo, categoria, monto, cuenta) VALUES
        ('2026-02-27','Saldo Inicial','Ingreso','Regulación de caja',1300000,'MercadoPago Manuel'),
        ('2026-02-27','Toma Dinero Plus','Ingreso','Préstamos',2817000,'MercadoPago Manuel'),
        ('2026-02-27','Pago Carlos','Egreso','Tela',-2817000,'MercadoPago Manuel'),
        ('2026-03-01','Liquidación sueldos','Egreso','Sueldos',-1300000,'MercadoPago Manuel'),
        ('2026-03-05','Re-Stock','Ingreso','Restock / Drop',5500000,'MercadoPago Manuel'),
        ('2026-03-05','Pago Carlos','Egreso','Tela',-2000000,'MercadoPago Manuel'),
        ('2026-03-08','Ventas semanales','Ingreso','Ventas',2000000,'MercadoPago Manuel'),
        ('2026-03-09','Baesics Fem','Egreso','Producciones',-1500000,'MercadoPago Manuel'),
        ('2026-03-10','Alquiler','Egreso','Oblig. Oficina',-900000,'MercadoPago Manuel'),
        ('2026-03-10','Expensas','Egreso','Oblig. Oficina',-45000,'MercadoPago Manuel'),
        ('2026-03-15','Devolución Dinero Plus','Egreso','Préstamos',-2817000,'MercadoPago Manuel')
      `);
    }

    console.log("✅ Database initialized");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
