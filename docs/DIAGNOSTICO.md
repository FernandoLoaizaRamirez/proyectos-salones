# Enterarte cuando algo falla

> Migración `0012_diagnostico.sql` · Edge Function `diagnostico`
> Pantalla: **Panel → ¿Está todo bien?** (`/panel/diagnostico`)

---

## 1. El problema

Si algo se rompía un sábado a las once de la noche, **no había forma de
enterarse**. Y era peor que eso: el código se **tragaba** los fallos. En
`@salones/sync` había varios `catch {}` que se comían el error y seguían como si
nada.

El resultado era el peor posible: el invitado veía *"aún no hay mensajes"* —que
parece normal— en vez de un aviso de que algo va mal. Y tú te enterabas por un
WhatsApp enfadado.

## 2. Dos cosas nuevas

### A. Los fallos dejan rastro

Cuando una app no consigue el pase, no puede refrescar el contenido o falla al
subir una foto, ahora lo **reporta**. Los ves en **Panel → ¿Está todo bien?**

Con dos cuidados importantes:

- **Se agrupan.** El sondeo reintenta cada 3 segundos; sin agrupar, un invitado
  con mala cobertura generaría cientos de avisos. Se manda uno por tipo cada 5
  minutos, con la cuenta de las veces que se repitió.
- **No se manda la dirección completa.** Solo la ruta, nunca lo que va después
  del `?`. Esto **no es un detalle**: la llave de anfitrión viaja como `?a=<clave>`,
  así que guardar direcciones completas convertiría tu registro de errores en una
  lista de llaves para borrar bodas. El cliente manda solo la ruta y el servidor
  la vuelve a recortar.
- **Nunca se guarda contenido de invitados**: ni nombres, ni mensajes, ni fotos.

### B. La revisión antes del evento

Escribes el código del evento y pulsa **Revisar**. Hace **de verdad** lo mismo
que hará el teléfono de un invitado, con la misma llave pública:

1. ¿El evento existe y está activo?
2. ¿Los invitados pueden obtener su pase?
3. ¿Se puede leer el contenido con ese pase?
4. ¿Se pueden subir fotos y videos?

**Míralo la mañana del evento.** Es la diferencia entre enterarte a las diez de
la mañana o a las once de la noche.

## 3. Por qué no puse Sentry (ni nada parecido)

Lo pensé y lo descarté. Un servicio de esos vigila **caídas** —cuando la app
revienta—, y tu riesgo real es otro: que algo se **degrade en silencio** y siga
pareciendo normal. Un fallo al pedir el pase no revienta nada; simplemente deja
el muro vacío.

Además habría significado meter una dependencia externa en 14 apps, mandar datos
de tus invitados a un tercero (justo después de escribir un aviso de privacidad
que dice quién los recibe), y otra cuenta más que administrar.

Esto son ~200 líneas, vive en tu propio Supabase, y vigila exactamente lo que se
te puede romper. Si algún día creces mucho, Sentry tendrá sentido; hoy no.

## 4. Encendido

1. **SQL Editor** → pega `supabase/migrations/0012_diagnostico.sql` entero. Es
   aditiva y no toca nada de lo que ya existe.
2. Despliega la función:
   ```
   supabase functions deploy diagnostico --no-verify-jwt
   ```
   No hay secretos que configurar.
3. `pnpm test` — las 5 pruebas de `diagnostico.test.ts` se encienden solas.
4. Entra a **Panel → ¿Está todo bien?** y revisa el evento `demo`.

> Los fallos se borran solos a los 30 días. La limpieza se hace al abrir la
> pantalla, así que no hace falta programar ninguna tarea (que el plan gratis
> tampoco tiene).

## 5. Lo que falta

- **El invitado sigue sin ver un aviso.** Ahora tú te enteras, pero si el muro
  falla, el invitado sigue viendo "aún no hay mensajes". Poner un aviso amable
  en las 5 apps es el siguiente paso natural.
- **No hay alertas.** Tienes que entrar a mirar; nadie te manda un correo. Para
  eso hacen falta tareas programadas, que el plan gratis no tiene.
- **No hay medición de espacio.** El aviso de que te acercas al límite de 1 GB
  de Supabase no está: eso se ve en el panel de Supabase.

## 6. Para el que lea el código

- `supabase/migrations/0012_diagnostico.sql` — tabla `app_errores`, **RLS
  activada y sin políticas = cerrada**. Solo escribe la función, con la llave de
  servicio. Con candados de tamaño para que nadie la llene de texto.
- `supabase/functions/diagnostico/index.ts` — `POST` registra (público),
  `GET ?e=` revisa (sesión de staff, acotado a los eventos de su salón).
- `packages/sync/src/index.ts` — `reportar()`: agrupa por tipo, nunca lanza, y
  manda `location.pathname` (que por construcción no lleva query).
- `tests/aislamiento/diagnostico.test.ts` (5) — incluye que la tabla no se puede
  ni leer ni escribir con la llave pública.

Relacionado: [`CIERRE-DE-EVENTO.md`](CIERRE-DE-EVENTO.md), [`LEGAL.md`](LEGAL.md).
