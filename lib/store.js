import { sql } from '@vercel/postgres';

const hayDB = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);

// Respaldo en memoria para desarrollo local sin base de datos.
globalThis.__memoria ||= [];
let tablaLista = false;

async function asegurarTabla() {
  if (tablaLista) return;
  await sql`
    CREATE TABLE IF NOT EXISTS respuestas (
      id SERIAL PRIMARY KEY,
      tipo TEXT NOT NULL,
      texto TEXT,
      etiquetas TEXT,
      sucursal TEXT,
      ipad TEXT,
      segundos INTEGER,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  tablaLista = true;
}

export async function guardar(r) {
  const fila = {
    tipo: r.tipo,
    texto: r.texto || null,
    etiquetas: (r.etiquetas || []).join('|') || null,
    sucursal: r.sucursal || null,
    ipad: r.ipad || null,
    segundos: Number.isFinite(r.segundos) ? Math.round(r.segundos) : null,
  };

  if (!hayDB) {
    const guardada = { id: globalThis.__memoria.length + 1, ...fila, creado_en: new Date().toISOString() };
    globalThis.__memoria.push(guardada);
    return guardada;
  }

  await asegurarTabla();
  const { rows } = await sql`
    INSERT INTO respuestas (tipo, texto, etiquetas, sucursal, ipad, segundos)
    VALUES (${fila.tipo}, ${fila.texto}, ${fila.etiquetas}, ${fila.sucursal}, ${fila.ipad}, ${fila.segundos})
    RETURNING *`;
  return rows[0];
}

export async function listar({ desde, hasta } = {}) {
  if (!hayDB) {
    return [...globalThis.__memoria].sort((a, b) => (a.creado_en < b.creado_en ? 1 : -1));
  }
  await asegurarTabla();
  const d = desde || '1970-01-01';
  const h = hasta || '2999-01-01';
  const { rows } = await sql`
    SELECT * FROM respuestas
    WHERE creado_en >= ${d}::timestamptz AND creado_en < (${h}::timestamptz + interval '1 day')
    ORDER BY creado_en DESC
    LIMIT 5000`;
  return rows;
}

export function autorizado(request) {
  const esperado = process.env.ADMIN_TOKEN;
  if (!esperado) return true; // sin token configurado, el panel queda abierto
  const enviado =
    request.headers.get('x-admin-token') ||
    new URL(request.url).searchParams.get('token');
  return enviado === esperado;
}
