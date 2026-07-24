# El candado de las fotos y los videos

> Migración `supabase/migrations/0010_candado_fotos.sql`
> Edge Function `supabase/functions/media-subir/`
> Runbook para encenderlo. Léelo entero antes de tocar nada.

---

## 1. El problema que arregla

El almacén de fotos y videos tenía **una sola regla**, puesta en la primera
migración:

> *"cualquiera puede subir al bucket media"*

Sin comprobar de qué evento. Y la llave pública de Supabase viaja **dentro del
JavaScript de cada app** (es pública por diseño, no es un descuido). Así que
cualquiera con dos dedos de frente podía sacarla del navegador y:

- **meter imágenes ajenas en el álbum de cualquier boda tuya**, o
- **llenarte el almacén** hasta reventar la cuota (y tienes 1 GB en el plan gratis).

El pase firmado de la `0006` protege los *datos* (la lista de fotos, los
mensajes). **No protegía los archivos.**

## 2. Cómo queda ahora

La app ya no sube directo. Primero **pide permiso**:

1. La app le enseña su pase del evento a la función `media-subir`.
2. La función verifica el pase contra la base (no se puede falsificar, caduca a
   los 30 minutos).
3. La función **decide ella misma la carpeta** — la del evento del pase — y
   devuelve un permiso de subida firmado, de un solo uso.
4. El navegador sube el archivo directo al almacén con ese permiso.

Lo importante es el paso 3: **el cliente ya no elige dónde escribe**. Aunque
alguien manipule la petición, la carpeta sale del evento que la base reconoció en
el pase. No hay forma de escribir en la boda de otro.

> El archivo **no pasa por la función**: solo se firma el permiso. Por eso no hay
> límite de tamaño ni coste por cada megabyte que suben tus invitados.

### Por qué no se hizo "como en `items`"

Lo natural habría sido copiar el truco que ya usamos para los datos: una regla en
la base que lea el encabezado del pase. **No se hizo a propósito.** En el almacén
ese camino es arena:

- leer encabezados dentro de las reglas del almacén **no está documentado**, y
- en las reglas de lectura está **roto desde 2024**
  ([supabase/supabase#29908](https://github.com/supabase/supabase/issues/29908),
  todavía abierto).

Ya nos costó una vez, con el JWT del primer intento de la `0006`. Las URL
firmadas sí son la vía soportada.

---

## 3. ⚠️ Lo que esto **no** arregla

**Cierra la escritura. La lectura sigue abierta.**

El bucket es público, y en un bucket público el almacén ni siquiera consulta las
reglas: **quien tenga la dirección de una foto la ve, sin llave y para siempre.**

Hoy eso funciona como un "enlace no listado":

- las direcciones llevan 8 caracteres al azar, así que no se adivinan, y
- la **lista** de fotos sí está protegida (vive en `items`, detrás del pase), así
  que nadie puede ir descubriéndolas una por una.

Pero si una dirección se filtra, no caduca nunca.

Cerrar eso pide: bucket privado + guardar la *ruta* en vez de la dirección +
firmar direcciones de lectura al vuelo. Eso toca las fotos **ya guardadas**, así
que va en su propio incremento, con migración de datos. Meterlo aquí habría
convertido un cambio reversible en uno capaz de dejar sin fotos un álbum en
producción.

---

## 4. Encendido — los pasos, en orden

> ⚠️ **Nada de esto se hace durante un evento en vivo.**

### Paso 1 · Aplicar la migración

Supabase → **SQL Editor** → pega `0010_candado_fotos.sql` **hasta antes del
"BLOQUE FINAL"**.

Solo concede permisos. **No cierra nada** y no rompe nada.

### Paso 2 · Desplegar la función

Desde la carpeta del proyecto, un solo comando:

```
supabase functions deploy media-subir --no-verify-jwt
```

El `--no-verify-jwt` es a propósito: la llave es el pase del evento, no una
sesión de Supabase. **No hay ningún secreto que configurar** — la llave de
servicio la inyecta Supabase dentro de la función.

**Comprobación:** corre las pruebas. Las 5 de `media.test.ts` se encienden solas
al detectar la función:

```
pnpm test
```

### Paso 3 · Fusionar y desplegar las apps

Fusiona el PR y espera a que Vercel construya **álbum** y **muro** (las dos que
suben archivos).

Mientras tanto no hay riesgo: la app pide permiso y, **si la función no
contesta, sube por el camino de siempre**. Nada se rompe a medio camino.

### Paso 4 · EL CORTE

Cuando el paso 3 esté desplegado y probado, corre el **BLOQUE FINAL** de
`0010_candado_fotos.sql` (quítale los `--`). Eso quita la regla que deja subir a
cualquiera.

### Paso 5 · Comprobar que de verdad quedó cerrado

Esta es a mano, una sola vez. Automatizarla exigiría intentar una subida real, y
si el corte no estuviera hecho escribiría basura en tu almacén.

En una terminal, sustituyendo `<TU-URL>` y `<TU-LLAVE-PUBLICA>`:

```
curl -i -X POST "<TU-URL>/storage/v1/object/media/prueba/hackeo.jpg" \
  -H "apikey: <TU-LLAVE-PUBLICA>" \
  -H "Content-Type: image/jpeg" \
  --data-binary "no-importa"
```

- **Antes del corte** responde `200`. ← el agujero
- **Después del corte** debe responder **`403`**. ← cerrado

Después, con un evento de prueba, sube una foto desde el álbum en el navegador:
**debe seguir funcionando**. Si no sube, revierte (paso 6) y avísame.

### Paso 6 · Cómo revertir

En el SQL Editor:

```sql
create policy "subida publica media" on storage.objects for insert
  with check (bucket_id = 'media');
```

Todo vuelve a como estaba. La migración es aditiva: no se pierde ninguna foto.

---

## 5. Para el que lea el código

- Función: `supabase/functions/media-subir/index.ts` (Deno, sin dependencias,
  mismo estilo que `evento-config`)
- Migración: `supabase/migrations/0010_candado_fotos.sql`
- En `@salones/sync`: `subirArchivo` pide permiso primero y **cae al camino
  viejo** si la función no contesta (no-fatal, como el pase). La interfaz
  `ProveedorSync` **no cambia**.
- Pruebas: `tests/aislamiento/media.test.ts` (5, ninguna sube nada; incluye
  intentos de escapar de la carpeta con `../` en el nombre del archivo)

Relacionado: [`LLAVE-ANFITRION.md`](LLAVE-ANFITRION.md),
[`MIGRACION-TOKEN-FIRMADO.md`](MIGRACION-TOKEN-FIRMADO.md).
