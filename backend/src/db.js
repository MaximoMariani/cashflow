const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cuentas (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        nombre VARCHAR(100) NOT NULL,
        balance_actual NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, nombre)
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        fecha DATE NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso')),
        categoria VARCHAR(100) NOT NULL,
        monto NUMERIC(15,2) NOT NULL,
        cuenta VARCHAR(100) NOT NULL,
        certeza VARCHAR(10) NOT NULL DEFAULT 'CONFIRMADO',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS proyecciones (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        fecha DATE NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso')),
        categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
        monto NUMERIC(15,2) NOT NULL,
        cuenta VARCHAR(100) DEFAULT '',
        notas TEXT DEFAULT '',
        escenario VARCHAR(10) NOT NULL DEFAULT 'PROBABLE',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dashboard_config (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
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
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        concepto VARCHAR(255),
        monto NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS fondos_inversion (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        nombre VARCHAR(255),
        monto NUMERIC(15,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS obligaciones (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        fecha_vencimiento DATE NOT NULL,
        concepto VARCHAR(255) NOT NULL,
        categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
        cuenta VARCHAR(100) NOT NULL,
        monto NUMERIC(15,2) NOT NULL CHECK (monto > 0),
        notas TEXT DEFAULT '',
        estado VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PAGADA')),
        fecha_pago DATE,
        certeza VARCHAR(10) NOT NULL DEFAULT 'CONFIRMADA',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS financial_settings (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        umbral_verde NUMERIC(15,2) NOT NULL DEFAULT 1000000,
        umbral_amarillo NUMERIC(15,2) NOT NULL DEFAULT 200000,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Migración: corregir UNIQUE en cuentas — de UNIQUE(nombre) a UNIQUE(user_id, nombre)
    // Esto permite que dos usuarios distintos tengan una cuenta con el mismo nombre.
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'cuentas'::regclass AND contype = 'u' AND conname = 'cuentas_nombre_key'
        ) THEN
          ALTER TABLE cuentas DROP CONSTRAINT cuentas_nombre_key;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'cuentas'::regclass AND contype = 'u' AND conname = 'cuentas_user_id_nombre_key'
        ) THEN
          ALTER TABLE cuentas ADD CONSTRAINT cuentas_user_id_nombre_key UNIQUE(user_id, nombre);
        END IF;
      END$$;
    `);

    // Migraciones: agregar user_id a tablas existentes que no lo tienen
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
          ALTER TABLE transactions ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cuentas' AND column_name='user_id') THEN
          ALTER TABLE cuentas ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proyecciones' AND column_name='user_id') THEN
          ALTER TABLE proyecciones ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='obligaciones' AND column_name='user_id') THEN
          ALTER TABLE obligaciones ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dinero_estimado' AND column_name='user_id') THEN
          ALTER TABLE dinero_estimado ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fondos_inversion' AND column_name='user_id') THEN
          ALTER TABLE fondos_inversion ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='certeza') THEN
          ALTER TABLE transactions ADD COLUMN certeza VARCHAR(10) NOT NULL DEFAULT 'CONFIRMADO';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='obligaciones' AND column_name='certeza') THEN
          ALTER TABLE obligaciones ADD COLUMN certeza VARCHAR(10) NOT NULL DEFAULT 'CONFIRMADA';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proyecciones' AND column_name='escenario') THEN
          ALTER TABLE proyecciones ADD COLUMN escenario VARCHAR(10) NOT NULL DEFAULT 'PROBABLE';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cuentas' AND column_name='balance_actual') THEN
          ALTER TABLE cuentas ADD COLUMN balance_actual NUMERIC(15,2) NOT NULL DEFAULT 0;
        END IF;
      END$$;
    `);

    // dashboard_config: cambiar PK de INTEGER a VARCHAR para soportar user_id
    // Si la tabla tiene id=1 (legacy), lo migramos a 'default'
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dashboard_config' AND column_name='id' AND data_type='integer') THEN
          ALTER TABLE dashboard_config ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dashboard_config' AND column_name='user_id') THEN
          ALTER TABLE dashboard_config ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT 'default';
        END IF;
      END$$;
    `);

    console.log("✅ Database initialized");
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
