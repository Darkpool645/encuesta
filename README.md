# Encuesta en caja (una sola pregunta)

App de kiosco para iPad. El cajero pregunta al cobrar, entrega el iPad y el cliente contesta
**“¿Qué mejoraría de su experiencia con nosotros?”**. Si el cliente dice que no, el cajero
registra también ese evento.

## Pantallas

| Ruta | Para quién | Qué hace |
|---|---|---|
| `/` | Cajero y cliente | Botones **Contestar encuesta** y **No quiso contestar**, la pregunta y la pantalla de gracias |
| `/admin` | Gerencia | Respuestas, tasa de respuesta, CSV y el prompt listo para pegar en una IA |

Eventos que se guardan: `respondida`, `rechazada` y `abandonada` (el cliente tomó el iPad pero
lo dejó 75 segundos sin tocar; regresa solo a la pantalla de caja).

## Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project**, elige el repo y despliega. Next.js se detecta solo.
3. En el proyecto, ve a **Storage → Create Database → Postgres (Neon)** y conéctala. Vercel
   inyecta `POSTGRES_URL`; la tabla `respuestas` se crea sola en el primer registro.
4. En **Settings → Environment Variables** agrega `ADMIN_TOKEN` con una contraseña tuya.
5. Vuelve a desplegar (**Redeploy**) para que tome las variables.

Sin base de datos la app funciona igual, pero guarda en memoria y se borra en cada
despliegue: sirve para probar, no para producción.

Local: `npm install` y `npm run dev`.

## Dejar el iPad listo

1. Abre la URL en Safari y toca **Compartir → Añadir a pantalla de inicio**. Así corre a
   pantalla completa, sin barra de direcciones.
2. Abre la app desde el ícono, toca arriba a la derecha y pon **sucursal** y **nombre del iPad**
   (por ejemplo, “Caja 1”). Queda guardado en ese iPad y se etiqueta cada respuesta.
3. Activa **Ajustes → Accesibilidad → Acceso guiado** y actívalo con triple clic al entregar el
   iPad: el cliente no puede salir de la app.
4. Ajustes → Pantalla y brillo → Bloqueo automático: **Nunca**.

Si el wifi falla, los registros se guardan en el iPad y se envían solos cuando vuelve la
conexión. La pantalla de caja indica cuántos quedan pendientes.

## Analizar con IA

En `/admin`, **Copiar respuestas con instrucciones para IA** copia al portapapeles las respuestas
del periodo junto con un prompt que pide agrupar por temas, contar menciones, citar ejemplos y
separar lo urgente (higiene, cobros, maltrato). Pégalo en Claude y listo. El CSV sirve si
prefieres analizarlo en una hoja de cálculo.

## Notas

- La encuesta es anónima: no se guarda nombre, cuenta ni monto.
- Los temas sugeridos (comida, espera, atención, precios…) son opcionales y aceleran el
  agrupado, pero el texto libre es lo que manda.
- El botón “No quiso contestar” es tan importante como el otro: sin él, la tasa de respuesta no
  significa nada.
