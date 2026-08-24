'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PREGUNTA = '¿Qué mejoraría de su experiencia con nosotros?';

const TEMAS = [
  'La comida',
  'El tiempo de espera',
  'La atención',
  'Los precios',
  'La limpieza',
  'El ambiente',
  'El menú digital',
  'Otra cosa',
];

const SEGUNDOS_INACTIVIDAD = 75;
const SEGUNDOS_GRACIAS = 5;
const CLAVE_COLA = 'encuesta:cola';
const CLAVE_CONFIG = 'encuesta:config';

/* Envío con cola local: si el iPad pierde wifi, el evento no se pierde. */
async function enviar(evento) {
  try {
    const r = await fetch('/api/respuestas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evento),
    });
    if (!r.ok) throw new Error('rechazado');
    return true;
  } catch {
    const cola = JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]');
    cola.push(evento);
    localStorage.setItem(CLAVE_COLA, JSON.stringify(cola));
    return false;
  }
}

async function vaciarCola() {
  const cola = JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]');
  if (!cola.length) return 0;
  const pendientes = [];
  for (const evento of cola) {
    try {
      const r = await fetch('/api/respuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evento),
      });
      if (!r.ok) throw new Error('rechazado');
    } catch {
      pendientes.push(evento);
    }
  }
  localStorage.setItem(CLAVE_COLA, JSON.stringify(pendientes));
  return cola.length - pendientes.length;
}

export default function Kiosco() {
  const [vista, setVista] = useState('caja'); // caja | encuesta | gracias | ajustes
  const [texto, setTexto] = useState('');
  const [temas, setTemas] = useState([]);
  const [aviso, setAviso] = useState('');
  const [config, setConfig] = useState({ sucursal: '', ipad: '' });
  const [pendientes, setPendientes] = useState(0);
  const inicio = useRef(0);
  const temporizador = useRef(null);

  const anunciar = useCallback((m) => {
    setAviso(m);
    setTimeout(() => setAviso(''), 3500);
  }, []);

  const contarPendientes = () =>
    setPendientes(JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]').length);

  useEffect(() => {
    setConfig(JSON.parse(localStorage.getItem(CLAVE_CONFIG) || '{"sucursal":"","ipad":""}'));
    contarPendientes();
    const t = setInterval(async () => {
      const enviados = await vaciarCola();
      if (enviados) anunciar(`Se sincronizaron ${enviados} registro(s) pendientes.`);
      contarPendientes();
    }, 20000);
    return () => clearInterval(t);
  }, [anunciar]);

  const registrar = useCallback(
    async (evento) => {
      const ok = await enviar({ ...evento, sucursal: config.sucursal, ipad: config.ipad });
      contarPendientes();
      if (!ok) anunciar('Sin conexión: el registro se guardó y se enviará solo.');
      return ok;
    },
    [config, anunciar]
  );

  const volverACaja = useCallback(() => {
    setTexto('');
    setTemas([]);
    setVista('caja');
  }, []);

  // Inactividad durante la encuesta: se registra como abandonada y regresa a caja.
  useEffect(() => {
    if (vista !== 'encuesta') return undefined;
    const reiniciar = () => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => {
        registrar({ tipo: 'abandonada', segundos: (Date.now() - inicio.current) / 1000 });
        volverACaja();
      }, SEGUNDOS_INACTIVIDAD * 1000);
    };
    reiniciar();
    window.addEventListener('touchstart', reiniciar);
    window.addEventListener('keydown', reiniciar);
    return () => {
      clearTimeout(temporizador.current);
      window.removeEventListener('touchstart', reiniciar);
      window.removeEventListener('keydown', reiniciar);
    };
  }, [vista, registrar, volverACaja]);

  useEffect(() => {
    if (vista !== 'gracias') return undefined;
    const t = setTimeout(volverACaja, SEGUNDOS_GRACIAS * 1000);
    return () => clearTimeout(t);
  }, [vista, volverACaja]);

  function abrirEncuesta() {
    inicio.current = Date.now();
    setVista('encuesta');
  }

  async function rechazar() {
    await registrar({ tipo: 'rechazada' });
    anunciar('Registrado: el cliente no quiso contestar.');
  }

  async function enviarRespuesta() {
    await registrar({
      tipo: 'respondida',
      texto,
      etiquetas: temas,
      segundos: (Date.now() - inicio.current) / 1000,
    });
    setVista('gracias');
    setTexto('');
    setTemas([]);
  }

  function alternarTema(t) {
    setTemas((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function guardarConfig(e) {
    e.preventDefault();
    const datos = {
      sucursal: e.target.sucursal.value.trim(),
      ipad: e.target.ipad.value.trim(),
    };
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify(datos));
    setConfig(datos);
    setVista('caja');
    anunciar('Ajustes guardados en este iPad.');
  }

  /* ---------------- Vistas ---------------- */

  if (vista === 'encuesta') {
    return (
      <main className="pantalla">
        <div className="centro">
          <section className="comanda">
            <p style={{ margin: 0, fontSize: 13, letterSpacing: '.16em', textTransform: 'uppercase', color: '#7d8d87' }}>
              Una sola pregunta
            </p>
            <h1 className="pregunta">{PREGUNTA}</h1>
            <p className="ayuda">Elija los temas que apliquen y cuéntenos con sus palabras. Es anónimo.</p>

            <div className="temas">
              {TEMAS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tema"
                  aria-pressed={temas.includes(t)}
                  onClick={() => alternarTema(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <textarea
              className="campo"
              value={texto}
              autoFocus
              maxLength={1500}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Por ejemplo: el arroz llegó frío y tardaron en traer la cuenta."
            />

            <div className="pie-comanda">
              <button type="button" className="saltar" onClick={volverACaja}>
                Cerrar sin enviar
              </button>
              <button
                type="button"
                className="enviar"
                disabled={!texto.trim() && !temas.length}
                onClick={enviarRespuesta}
              >
                Enviar respuesta
              </button>
            </div>
          </section>
        </div>
        {aviso && <p className="aviso">{aviso}</p>}
      </main>
    );
  }

  if (vista === 'gracias') {
    return (
      <main className="pantalla">
        <div className="centro">
          <div className="gracias">
            <div className="sello" aria-hidden="true">✓</div>
            <h1 className="rotulo" style={{ maxWidth: '14ch' }}>Gracias, lo leemos <em>hoy mismo</em>.</h1>
            <p className="instruccion">Puede devolver el iPad al cajero.</p>
          </div>
        </div>
      </main>
    );
  }

  if (vista === 'ajustes') {
    return (
      <main className="pantalla">
        <div className="centro">
          <h1 className="rotulo">Ajustes de este iPad</h1>
          <form className="ajustes" onSubmit={guardarConfig}>
            <label>
              Sucursal
              <input name="sucursal" defaultValue={config.sucursal} placeholder="Centro" />
            </label>
            <label>
              Nombre del iPad
              <input name="ipad" defaultValue={config.ipad} placeholder="Caja 1" />
            </label>
            <div className="pie-comanda" style={{ justifyContent: 'flex-start' }}>
              <button type="submit" className="enviar" style={{ background: 'var(--ambar)', color: '#2a1a00' }}>
                Guardar
              </button>
              <button type="button" className="saltar" style={{ color: 'var(--papel-tenue)' }} onClick={() => setVista('caja')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <header className="marca">
        <span>Encuesta en caja</span>
        <button type="button" onClick={() => setVista('ajustes')}>
          {[config.sucursal, config.ipad].filter(Boolean).join(' · ') || 'Configurar iPad'}
        </button>
      </header>

      <div className="centro">
        <div>
          <h1 className="rotulo">
            Pregúntele: <em>“¿Desea contestar una encuesta?”</em>
          </h1>
          <p className="instruccion">
            Es una sola pregunta y toma menos de un minuto. Elija abajo lo que respondió el cliente.
          </p>
        </div>

        <div className="acciones">
          <button type="button" className="boton principal" onClick={abrirEncuesta}>
            <strong>Contestar encuesta</strong>
            <span>Entregue el iPad al cliente</span>
          </button>
          <button type="button" className="boton" onClick={rechazar}>
            <strong>No quiso contestar</strong>
            <span>Se registra y vuelve aquí</span>
          </button>
        </div>
      </div>

      <footer className="marca" style={{ marginTop: 24 }}>
        <span>{pendientes ? `${pendientes} registro(s) por sincronizar` : 'Todo sincronizado'}</span>
        <a href="/admin" style={{ color: 'inherit' }}>Panel</a>
      </footer>

      {aviso && <p className="aviso">{aviso}</p>}
    </main>
  );
}
