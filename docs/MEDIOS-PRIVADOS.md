# Las fotos dejan de ser públicas

> Migración `0013_media_privado.sql` · Edge Function `media-ver`
> Es la segunda mitad de [`CANDADO-FOTOS.md`](CANDADO-FOTOS.md).

---

## 1. Qué cierra

La `0010` cerró la **escritura**: nadie puede ya meter fotos en la boda de otro.
Faltaba la **lectura**.

El almacén nació público, y en un bucket público Supabase **ni siquiera consulta
las reglas**: quien tuviera la dirección de una foto la veía, sin ninguna llave y
**para siempre**. Si una dirección se filtraba, no caducaba nunca.

## 2. Cómo queda

Lo que la base guarda deja de ser una dirección que sirva sola: pasa a ser una
**referencia**.

Al abrir el álbum, la app presenta su pase del evento y recibe direcciones
**firmadas que caducan en una hora**. Si mañana alguien reenvía una de esas
direcciones, ya no abre nada.

La comprobación que de verdad importa: **cada ruta pedida tiene que estar dentro
de la carpeta del evento del pase**. Sin eso, bastaría conocer el nombre de un
archivo ajeno para sacar las fotos de otra boda. Hay pruebas específicas para
esto, incluidos los intentos de salirse con `..` o con carpetas que solo
*empiezan* igual (`demo-otra/`).

### Por qué no hay que migrar ninguna foto

La ruta del archivo **se deduce** de la dirección que ya está guardada
(`…/object/public/media/<ruta>`). Así que **no se toca ni una fila** de las que
ya existen.

Fue una decisión deliberada: una migración de datos sobre álbumes de eventos
reales es justo el riesgo que no merece la pena correr cuando el dato ya está
ahí dentro. Si algún día cambias de proveedor (R2, Cloudinary), **ese** será el
momento de reescribirlas — y para entonces el código ya no dependerá del
proveedor, que era la otra mitad de lo que buscabas.

## 3. Encendido

> ⚠️ **Nada de esto durante un evento en vivo.**

- [ ] **1 · Desplegar la función**
      ```
      supabase functions deploy media-ver --no-verify-jwt
      ```
      No cierra nada todavía. Sin secretos que configurar.

- [ ] **2 · Desplegar el álbum** (fusionar el PR y esperar la construcción).
      Tampoco cierra nada: mientras el bucket siga público, si la función no
      contesta la app **se queda con las direcciones de siempre**. Por eso este
      paso es seguro a cualquier hora.

- [ ] **3 · Comprobar antes de cortar.** Abre el álbum de un evento de prueba:
      las fotos deben verse. Mira la dirección de una imagen: debe llevar
      `/object/sign/` y un `token=`. Si lleva `/object/public/`, la función no
      está funcionando — **no cortes**.

- [ ] **4 · EL CORTE.** SQL Editor:
      ```sql
      update storage.buckets set public = false where id = 'media';
      ```

- [ ] **5 · Comprobar después.** Copia la dirección de una foto **tal como está
      guardada en la base** (la que empieza por `/object/public/`) y ábrela en el
      navegador: **debe dar error**. Y el álbum debe seguir viéndose igual.

- [ ] **6 · Si algo va mal**, vuelve atrás en un segundo:
      ```sql
      update storage.buckets set public = true where id = 'media';
      ```
      No se pierde ninguna foto: solo cambia quién puede verlas.

## 4. Lo que cambia para la gente

**Esto tiene un efecto que conviene que sepas:** si un invitado guardó el enlace
directo de una foto y lo compartió por WhatsApp, **después del corte ese enlace
deja de funcionar**.

Es exactamente lo que queríamos —que las fotos de una boda no anden sueltas por
internet para siempre— pero es un cambio de comportamiento real. Para compartir,
lo que hay que pasar es el enlace del **álbum**, no el de una foto suelta.

## 5. Lo que no cubre

- **El brindis va por su cuenta.** Usa otro proyecto de Supabase y otro bucket,
  con las llaves escritas en el código. Esto no lo toca. Unificarlo es su propia
  tarea.
- **Las fotos del muro no están aquí**: se guardan como texto dentro de la propia
  base, no en el almacén. Las protege el candado por evento de siempre.
- **Descargar sigue funcionando**, pero con direcciones que caducan a la hora. Si
  alguien deja una descarga masiva a medias y vuelve al día siguiente, tendrá que
  recargar el álbum.

## 6. Para el que lea el código

- `supabase/functions/media-ver/index.ts` — firma **en lote** (un álbum tiene
  cientos de fotos; de una en una sería una llamada por foto). Descarta en
  silencio lo que no sea del evento: ni confirma ni desmiente que exista.
- `packages/sync/src/index.ts` — `resolverMedios(evento, direcciones)` devuelve
  un mapa `guardada → para mostrar`. **Nunca falla**: lo que no reconoce lo
  devuelve tal cual, así que las fotos de ejemplo (`/img/…`), las del muro
  (`data:`) y las del modo local (`blob:`) siguen intactas. Cachea las firmas
  para no pedirlas cada tres segundos con cada sondeo.
- `apps/album-fotos` — todo lo que pinta o descarga pasa por `ver(url)`.
- `tests/aislamiento/media-ver.test.ts` (5) — ninguna escribe ni borra.

Relacionado: [`CANDADO-FOTOS.md`](CANDADO-FOTOS.md), [`LLAVE-ANFITRION.md`](LLAVE-ANFITRION.md).
