# Cerrar un evento: entregar y borrar

> Edge Function `supabase/functions/evento-cierre/`
> Pantalla: **Panel → Cerrar un evento** (`/evento/cerrar` en el catálogo)

---

## 1. Por qué existe

El aviso de privacidad **promete** que, al cerrar un evento, el salón puede pedir
la entrega de todo el material y su borrado. Hasta ahora eso no se podía cumplir:
no había forma de sacar el contenido completo ni de borrarlo.

Una promesa por escrito que no se puede cumplir es peor que no haberla hecho.

De paso, el borrado limpia los **archivos huérfanos**: hasta hoy, quitar una foto
borraba su ficha pero dejaba el archivo ocupando espacio para siempre.

## 2. Quién puede hacer qué

| | Quién | Por qué |
|---|---|---|
| **Ver y descargar** el material | El anfitrión (con su llave `&a=`) **o** el staff del salón | Es material de los novios; tienen derecho a llevárselo |
| **Borrar** el evento | **Solo** el dueño o administrador del salón, **con sesión iniciada** | Es irreversible |

**Borrar no puede colgar de la llave de anfitrión.** Esa llave la tienen los
novios y viaja en un enlace de WhatsApp; sirve para moderar un mensaje, no para
borrar una boda entera. Por eso el borrado exige la sesión del staff.

Encima de eso hay dos frenos más:

- **No se puede borrar sin haber descargado antes.** El botón sigue apagado hasta
  que la entrega se ha bajado en ese navegador.
- Hay que **escribir el código del evento a mano** para confirmar.

## 3. Cómo se usa

1. Entra al panel y abre **Cerrar un evento**.
2. Escribe el código del evento y pulsa **Ver**. Aparece el inventario: cuántos
   archivos, cuánto pesan y cuántos registros hay de cada cosa.
3. **Descargar la entrega completa.** Baja tres cosas:
   - `evento-<codigo>-datos.json` — todos los mensajes, canciones y confirmaciones
   - `evento-<codigo>-archivos.txt` — la lista de enlaces de todas las fotos y videos
   - los archivos, uno a uno (el navegador pedirá permiso para descargas múltiples)
4. Comprueba que lo descargado está completo y guárdalo donde guardes tu trabajo.
5. Si quieres liberar el espacio, escribe el código y pulsa **Borrar**.

Al borrar, el evento queda **cerrado**: deja de emitir pases, así que los enlaces
que circulan por WhatsApp dejan de abrir nada.

> 💡 Con muchos archivos, el `.txt` de enlaces es tu red de seguridad: sirve para
> volver a descargarlos con un gestor de descargas si algo se cortó a medias.
> **Ojo:** esos enlaces dejan de servir en cuanto borras.

## 4. Encendido

Un solo comando:

```
supabase functions deploy evento-cierre --no-verify-jwt
```

No hay secretos que configurar. El `--no-verify-jwt` es a propósito: la función
verifica ella misma quién llama, con dos llaves distintas según la operación.

Para que el borrado funcione, tu usuario tiene que estar **ligado a un salón con
rol `owner` o `admin`** — eso lo hace el script `vincular-staff` (PR #5).

**Comprobación:** `pnpm test`. Las 6 pruebas de `cierre.test.ts` se encienden
solas al detectar la función.

## 5. Respaldos: la parte donde tengo que ser honesto

**No te construí un sistema de respaldos automáticos, y creo que ahora mismo no
te conviene uno.** Esto es lo que hay:

### Lo que NO tienes hoy

En el plan **gratis** de Supabase **no hay ninguna garantía de respaldo útil**. Si
la base se corrompe o el proyecto se pausa por inactividad, no hay de dónde
recuperar. Eso no lo arregla nada de lo que yo escriba en el repositorio.

### Lo que sí puedes hacer, y es suficiente para tu tamaño

**La entrega ES tu respaldo.** El flujo realista para un fotógrafo de eventos:

1. Terminado el evento, entras y **descargas la entrega completa**.
2. Guardas esa carpeta donde guardas el resto de tu trabajo (disco externo, nube).
3. Se la entregas a los novios.
4. Cuando ya está a salvo en dos sitios, borras del servidor.

Eso te da algo que un respaldo automático no te da: el material **fuera** de la
infraestructura, en tus manos, y el servidor limpio. Además te ahorra la cuota de
1 GB, que es lo que de verdad te va a apretar.

### Cuando tengas un cliente que pague

Sube a **Supabase Pro** (~25 USD/mes). Incluye respaldos diarios y quita el
riesgo de que el proyecto se pause. Lo vas a necesitar de todas formas por espacio
(el plan gratis da ~1 GB: **una sola boda con fotos y brindis se lo come**). Es el
tapón 5 de la auditoría.

**Mientras no haya cliente que pague, la disciplina de descargar después de cada
evento es lo que te protege.** No es glamuroso, pero funciona.

## 6. Lo que esto no cubre

- **No hay borrado automático por calendario.** Nadie borra solo a los N días; lo
  decides tú. Es deliberado: un borrado automático en un sistema sin respaldos es
  una forma elegante de perder una boda.
- **El `.json` no es un álbum.** Es el dato crudo. Si algún día quieres entregar
  un PDF o una galería bonita, eso es otra cosa.
- **Descargar cientos de archivos desde el navegador es tosco.** Funciona, pero
  con eventos muy grandes conviene usar el `.txt` de enlaces con un gestor de
  descargas.

## 7. Para el que lea el código

- Función: `supabase/functions/evento-cierre/index.ts`
  - `GET ?e=<codigo>` → inventario (pase de anfitrión o sesión de staff)
  - `POST {e, confirmar}` → borrado (sesión de staff, rol owner/admin)
  - **Orden del borrado:** archivos primero, filas después. Si algo falla a
    medias, quedan filas apuntando a archivos que faltan —visible y arreglable—
    en vez de archivos huérfanos sin índice, que no hay forma de encontrar.
  - **La sesión se comprueba antes de buscar el evento**, para que una petición
    sin permiso se rechace sin llegar a mirar ningún dato.
- Pantalla: `apps/catalogo/src/app/evento/cerrar/page.tsx`
- Pruebas: `tests/aislamiento/cierre.test.ts` (6). Las del camino destructivo usan
  un evento **que no existe**: si el candado funciona dan 403, y si se rompiera
  darían 404 sin borrar nada. Imposible que la prueba destruya contenido real.

Relacionado: [`LEGAL.md`](LEGAL.md) (lo que promete el aviso),
[`CANDADO-FOTOS.md`](CANDADO-FOTOS.md), [`LLAVE-ANFITRION.md`](LLAVE-ANFITRION.md).
