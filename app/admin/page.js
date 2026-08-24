'use client';

import { useEffect, useState } from 'react';

const CLAVE_TOKEN = 'encuesta:token';

const PROMPT_BASE = `Eres analista de experiencia del cliente en un restaurante. Abajo están las respuestas a una sola pregunta abierta: "¿Qué mejoraría de su experiencia con nosotros?".

Haz lo siguiente:
1. Agrupa las respuestas en temas (máximo 8). Nombra cada tema con las palabras del cliente, no con jerga.
2. Para cada tema: cuántas respuestas lo mencionan, el porcentaje del total, 2 citas representativas y qué tan urgente es arreglarlo.
3. Señala los problemas que se pueden resolver esta semana sin inversión, y los que requieren dinero o cambios de proceso.
4. Marca cualquier respuesta que mencione higiene, seguridad, cobro indebido o maltrato: esas van aparte y primero.
5. Cierra con las 3 acciones de mayor impacto, en una frase cada una.

Respuestas:
`;

export default function Panel() {
  const [token, setToken] = useState('');
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);

  async function cargar(t) {
    setError('');
    try {
      const r = await fetch('/api/respuestas', { headers: { 'x-admin-token': t || '' } });
      if (r.status === 401) {
        setError('Token inválido.');
        setFilas(null);
        return;
      }
      const datos = await r.json();
      setFilas(datos.filas);
      localStorage.setItem(CLAVE_TOKEN, t || '');
    } catch {
      setError('No se pudo cargar la información.');
    }
  }

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_TOKEN) || '';
    setToken(guardado);
    cargar(guardado);
  }, []);

  const respondidas = (filas || []).filter((f) => f.tipo === 'respondida');
  const rechazadas = (filas || []).filter((f) => f.tipo === 'rechazada');
  const total = respondidas.length + rechazadas.length;
  const tasa = total ? Math.round((respondidas.length / total) * 100) : 0;

  async function copiarPrompt() {
    const cuerpo = respondidas
      .map((f, i) => `${i + 1}. [${(f.etiquetas || '').split('|').filter(Boolean).join(', ') || 'sin tema'}] ${f.texto || ''}`)
      .join('\n');
    await navigator.clipboard.writeText(PROMPT_BASE + cuerpo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <main className="panel">
      <header className="marca" style={{ marginBottom: 24 }}>
        <span>Panel de la encuesta</span>
        <a href="/" style={{ color: 'inherit' }}>Volver a caja</a>
      </header>

      <h1 className="rotulo" style={{ fontSize: 'clamp(28px,4vw,44px)' }}>
        Qué nos están <em>pidiendo mejorar</em>
      </h1>

      <div className="barra" style={{ marginTop: 24 }}>
        <input
          className="ajustes"
          style={{
            background: 'var(--tinta-suave)',
            border: '1px solid var(--borde)',
            borderRadius: 12,
            padding: '12px 16px',
          }}
          type="password"
          value={token}
          placeholder="Token de acceso"
          onChange={(e) => setToken(e.target.value)}
        />
        <button type="button" onClick={() => cargar(token)}>Entrar</button>
        <a className="destacado" href={`/api/respuestas/export?token=${encodeURIComponent(token)}`}>
          Descargar CSV
        </a>
        <button type="button" onClick={copiarPrompt} disabled={!respondidas.length}>
          {copiado ? 'Copiado' : 'Copiar respuestas con instrucciones para IA'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--ambar)' }}>{error}</p>}

      {filas && (
        <>
          <div className="tarjetas">
            <div className="tarjeta"><b>{respondidas.length}</b><span>Contestaron</span></div>
            <div className="tarjeta"><b>{rechazadas.length}</b><span>Declinaron</span></div>
            <div className="tarjeta"><b>{tasa}%</b><span>Tasa de respuesta</span></div>
            <div className="tarjeta">
              <b>{(filas || []).filter((f) => f.tipo === 'abandonada').length}</b>
              <span>Abandonadas</span>
            </div>
          </div>

          <div className="lista">
            {respondidas.map((f) => (
              <article key={f.id} className="fila">
                <div className="meta">
                  <span>{new Date(f.creado_en).toLocaleString('es-MX')}</span>
                  {f.ipad && <span>· {f.ipad}</span>}
                  {f.etiquetas && <span>· {f.etiquetas.split('|').join(', ')}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.45 }}>{f.texto || '(solo temas)'}</p>
              </article>
            ))}
            {!respondidas.length && <p className="instruccion">Todavía no hay respuestas. Aparecerán aquí en cuanto lleguen.</p>}
          </div>
        </>
      )}
    </main>
  );
}
