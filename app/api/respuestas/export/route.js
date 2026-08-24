import { listar, autorizado } from '@/lib/store';

export const dynamic = 'force-dynamic';

function celda(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request) {
  if (!autorizado(request)) {
    return new Response('Token inválido', { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const filas = await listar({
    desde: searchParams.get('desde'),
    hasta: searchParams.get('hasta'),
  });

  const encabezado = ['id', 'fecha', 'tipo', 'texto', 'etiquetas', 'sucursal', 'ipad', 'segundos'];
  const cuerpo = filas.map((f) =>
    [f.id, new Date(f.creado_en).toISOString(), f.tipo, f.texto, f.etiquetas, f.sucursal, f.ipad, f.segundos]
      .map(celda)
      .join(',')
  );
  const csv = '\uFEFF' + [encabezado.join(','), ...cuerpo].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="encuesta-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
