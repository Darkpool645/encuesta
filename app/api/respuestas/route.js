import { NextResponse } from 'next/server';
import { guardar, listar, autorizado } from '@/lib/store';

export const dynamic = 'force-dynamic';

const TIPOS = ['respondida', 'rechazada', 'abandonada'];

export async function POST(request) {
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  if (!TIPOS.includes(cuerpo.tipo)) {
    return NextResponse.json({ error: 'Tipo de evento no reconocido' }, { status: 400 });
  }

  const texto = typeof cuerpo.texto === 'string' ? cuerpo.texto.trim().slice(0, 1500) : '';
  if (cuerpo.tipo === 'respondida' && !texto && !(cuerpo.etiquetas || []).length) {
    return NextResponse.json({ error: 'La respuesta llegó vacía' }, { status: 400 });
  }

  try {
    const fila = await guardar({ ...cuerpo, texto });
    return NextResponse.json({ ok: true, id: fila.id });
  } catch (e) {
    return NextResponse.json({ error: 'No se pudo guardar', detalle: String(e.message || e) }, { status: 500 });
  }
}

export async function GET(request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const filas = await listar({
    desde: searchParams.get('desde'),
    hasta: searchParams.get('hasta'),
  });
  return NextResponse.json({ filas });
}
