# Revisión técnica — Servicio gestionado (Suite para Salones)

> **Para:** el programador que revisa.
> **Qué se pide:** una segunda opinión sobre las decisiones de arquitectura, la
> seguridad y la deuda técnica de lo construido en esta ronda (el "servicio
> gestionado"). Al final hay una sección de **limitaciones conocidas** y otra de
> **preguntas concretas** — ese es el foco de la revisión.
> **Qué NO se pide todavía:** reescribir nada. Primero queremos saber qué priorizar.

El documento funcional/de negocio vive en [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md).
Este es el complemento técnico.

---

## 1. Contexto en una frase

Suite de **12 apps web** para eventos (bodas, XV, corporativos). Cada app se
despliega sola en Vercel y funciona por sí misma. Esta ronda agregó un **backend
compartido opcional** (`@salones/sync` + Supabase) que permite juntar en vivo el
contenido que mandan muchos teléfonos (mensajes, canciones, RSVP, ranking de
trivia, fotos), sin reescribir las apps.

El diseño clave es un **interruptor por variables de entorno**: sin credenciales
de Supabase, las apps corren en "modo local" (como antes); con credenciales,
pasan a "modo servidor". Mismo código. Esto mapea al modelo de negocio de 3
planes (Compra/Renta = local, Gestionado = servidor).

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js **16.2.10** (App Router, Turbopack), React **19.2.7** |
| Lenguaje | TypeScript **6.0.3** (strict, vía config compartida) |
| Estilos | Tailwind CSS **v4** (`@tailwindcss/postcss`), tokens en CSS variables (OKLCH) |
| Monorepo | pnpm workspaces (**pnpm 11.9.0**) + **Turborepo 2.10.2** |
| UI | `class-variance-authority`, `tailwind-merge`, `next-themes`, `lucide-react`, `qrcode.react` |
| Validación | `zod` (solo en `@salones/core`, tipos de dominio) |
| Hosting | **Vercel** (1 proyecto por app, deploy automático desde `main`) |
| Backend | **Supabase** (Postgres + Storage) — plan Free |
| Video (brindis) | Supabase Storage **aparte** + **Shotstack** (render en la nube) |

No hay dependencias nuevas de runtime en `@salones/sync`: habla con Supabase por
**REST (PostgREST) y fetch nativo**, no con el SDK `@supabase/supabase-js`.
(Excepción: la app `brindis`, que sí usa el SDK — ver §7 y §9.)

---

## 3. Estructura del monorepo

```
packages/
  core/     @salones/core   — vocabulario de dominio (Zod: Evento, Invitado, Mesa, AppMode…)
  ui/       @salones/ui      — design system (Button, Card, tokens OKLCH, theme provider)
  config/   @salones/config  — tsconfig y prettier compartidos
  sync/     @salones/sync    — ★ NUEVO: el "lugar central" (foco de esta revisión)
apps/
  sitio-salon, album-fotos, invitaciones, rsvp, pases-qr, mesas, muro,
  playlist, photobooth, mi-mesa, dinamicas, brindis, catalogo   (12 apps)
```

**Convención de paquetes compartidos:** se consumen como **código fuente TS**
(`"exports": { ".": "./src/index.ts" }`, `"type": "module"`), sin build propio.
Cada app los transpila con `transpilePackages: ["@salones/ui","@salones/core","@salones/sync"]`
en `next.config.mjs`. Simple, pero implica que los paquetes **no se typechequean
ni se publican de forma independiente** (ver deuda #14).

---

## 4. Arquitectura de `@salones/sync` (el núcleo)

Un único archivo: [`packages/sync/src/index.ts`](../packages/sync/src/index.ts) (~320 líneas).
Patrón **provider / strategy** detrás de una interfaz común:

```ts
export type ItemSync = { id: string; [clave: string]: unknown };

export interface ProveedorSync {
  readonly nombre: "local" | "servidor";
  listar<T extends ItemSync>(evento: string, coleccion: string): Promise<T[]>;
  guardar<T extends ItemSync>(evento: string, coleccion: string, item: T): Promise<void>;
  eliminar(evento: string, coleccion: string, id: string): Promise<void>;
  suscribir<T extends ItemSync>(evento: string, coleccion: string, cb: (items: T[]) => void): () => void;
  subirArchivo(evento: string, nombre: string, blob: Blob, tipo: string): Promise<string>;
}
```

Dos implementaciones:

- **`crearProveedorLocal()`** — `localStorage` para persistir + `BroadcastChannel`
  para avisar a otras pestañas + un `Set` de escuchas por clave para avisar a la
  **misma** pestaña (BroadcastChannel no se auto-entrega). `subirArchivo` devuelve
  un `URL.createObjectURL` (temporal, no viaja). Es el modo demo / Renta / Compra.

- **`crearProveedorServidor(url, anon)`** — habla con **PostgREST** (`/rest/v1/items`):
  - `listar/pedir`: `GET ...?evento=eq.X&coleccion=eq.Y&select=id,dato&order=creado.desc`
  - `guardar`: `POST` con `Prefer: resolution=merge-duplicates` (**upsert** por PK `id`)
  - `eliminar`: `DELETE ...&id=eq.Z`
  - `suscribir`: **sondeo (polling) cada 3 s**; compara `JSON.stringify` con la
    firma anterior y solo llama al callback si cambió.
  - `subirArchivo`: `POST /storage/v1/object/media/<evento>/<timestamp-rand>.<ext>`
    y devuelve la URL pública. Comprime imágenes antes (canvas → JPEG, ver §7 Álbum).

**Selector:** `obtenerSync()` es un singleton cacheado a nivel de módulo; elige
servidor si existen `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
si no, local. `estaConectado()` expone el modo.

**Evento actual:** `eventoActual()` lee `?e=<codigo>` de la URL (regex
`^[a-z0-9-]{1,60}$`, fallback `"demo"`); `sufijoEvento()` lo propaga a los enlaces
y QR que las apps generan. Esto se lee **por llamada** (no cacheado), así que
funciona con navegación SPA.

**Cómo lo usan las apps:** casi siempre a través de un hook o efecto:
`suscribir(eventoActual(), COLECCION, setEstado)` para leer en vivo, y
`guardar(...)` / `eliminar(...)` / `subirArchivo(...)` para escribir. Las apps
con lógica ya centralizada (playlist `use-canciones.ts`, dinámicas `use-ranking.ts`)
solo cambiaron el hook; el resto de la UI quedó intacto.

---

## 5. Modelo de datos y almacenamiento

**Una sola tabla** para todas las apps, eventos y colecciones:

```sql
create table items (
  evento     text not null,          -- "demo", "boda-garcia-x7k2", …
  coleccion  text not null,          -- "mensajes","canciones","respuestas","ranking","fotos"
  id         text primary key,       -- id del item (aleatorio, único global)
  dato       jsonb not null default '{}',
  creado     timestamptz not null default now()
);
create index items_evento_coleccion_creado on items (evento, coleccion, creado desc);
alter table items add constraint dato_tamano_max check (pg_column_size(dato) < 600000);
```

**Almacenamiento:** bucket público **`media`** (Storage), límite **25 MB**/archivo,
solo `image/*` y `video/*`. Ruta `media/<evento>/<archivo>`. **Sin política de
listado** (solo lectura por URL directa).

Mapa app → colección: muro=`mensajes`, playlist=`canciones`, rsvp=`respuestas`,
dinámicas=`ranking`, álbum=`fotos`. El `dato` jsonb guarda el resto del item
(texto, votos, estado, url, etc.); el `id` se separa a columna para el upsert.

El DDL completo y actual está en [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md#la-tabla-pégala-en-el-sql-editor-de-supabase).

---

## 6. Modelo de seguridad (Fases 4 y 5) — léase con atención

**Aislamiento por evento (RLS):** `items` tiene Row Level Security. Las políticas
exigen que el evento de la fila coincida con un **encabezado `x-evento`** que
`@salones/sync` manda en cada petición:

```sql
create policy "lectura por evento" on items for select
  using (evento = current_setting('request.headers', true)::json->>'x-evento');
-- idem insert (with check), update, delete
```

Resultado (verificado con pruebas de intruso vía `curl`, ver §8):
- Sin `x-evento` → `SELECT` devuelve `[]`, `INSERT` → **401**.
- Con la llave de un evento no se ve el de otro.
- El bucket `media` no se puede listar; los archivos solo se alcanzan por su URL.

**Lo que esto NO es (importante):** el código de evento es una **capacidad por
enlace (bearer secret en la URL)**, no autenticación de identidad.
Consecuencias:
- Cualquiera con el enlace de un evento puede **leer y escribir** ese evento — así
  debe ser para los invitados.
- …pero también puede **borrar** items de ese evento: no hay distinción
  anfitrión vs. invitado. Hoy borrar/moderar usa la misma llave que los invitados.
- La `anon`/`publishable` key es pública por diseño (va en el bundle). Toda la
  protección recae en que el **código de evento sea difícil de adivinar**
  (`slug` + 5 chars base36 ≈ 60M combinaciones) y no se filtre (referrer, capturas…).

Para demos y eventos de confianza es razonable. Para vender contratos formales,
el backlog contempla llave de anfitrión / cuentas (ver §9, deuda #2). **Nos
interesa la opinión del revisor sobre si este modelo es suficiente y qué
endurecer primero.**

---

## 7. Qué cambió, por fase (con commits)

| Commit | Fase | Resumen técnico |
|---|---|---|
| `882286f` | limpieza | Borra app muerta `recuerditos` (solo restos de build). |
| `bb78528` | catálogo | El sitio se ofrece en los 3 modelos; `notaGestionado` por producto. |
| `eb04d57` | **1** | Nace `@salones/sync` (local + servidor REST/polling). Muro conectado. |
| `c499c07` | **2** | Playlist (`use-canciones`), RSVP (colección `respuestas`, lista sigue local), Dinámicas (`use-ranking`) conectados. |
| `00bdd6f` | — | Se enciende Supabase real; llaves en `.env.local` y Vercel (muro, playlist, rsvp, dinámicas). Compat de llaves nuevas `sb_publishable_` (solo header `apikey`, sin `Authorization`). |
| `7042309` | **3** | `subirArchivo` en `@salones/sync` (bucket `media`); Álbum sube fotos comprimidas (canvas→JPEG ~1600px). |
| `547f5d8` | **4** | Multi-evento por `?e=` (`eventoActual`/`sufijoEvento`); generador de eventos del operador en `catalogo/evento`; límites de tamaño/tipo. |
| `b06a405` | **5·1** | La llave del evento viaja como header `x-evento` (paso inofensivo). |
| `ce6b9e7` | **5·2** | Políticas RLS que **exigen** `x-evento`; bucket sin listado. |

**Orden de despliegue de la Fase 5 (a propósito, para no romper en vivo):**
1) publicar apps que ya mandan el header (compatible con políticas viejas),
2) esperar a que las 5 apps estén desplegadas en Vercel,
3) recién entonces cambiar las políticas. Un swap de políticas antes del paso 2
habría tumbado las apps aún no actualizadas.

**Progressive enhancement:** en producción, una app sin las env de Supabase se
comporta idéntica a antes (modo local). Por eso publicar el refactor fue seguro:
para el visitante no cambió nada hasta encender el servidor.

---

## 8. Verificación realizada

**No hay suite de pruebas automatizadas.** La verificación fue manual pero
sistemática:

- **E2E funcional:** se levantó cada app (`next dev`) y se manejó con un navegador
  headless (rellenar formularios, jugar la trivia, etc.), comprobando la
  sincronización en vivo **entre dos pestañas** (invitado escribe → pantalla del
  anfitrión se actualiza sola). Repetido en producción tras cada deploy.
- **Aislamiento y candado (Fase 5):** pruebas adversariales con `curl` contra la
  API real: leer toda la tabla sin llave (→ `[]`), escribir sin llave (→ 401),
  listar el bucket (→ `[]`), usar la llave de un evento para leer otro (→ `[]`),
  y confirmar que las apps legítimas y la URL pública de una foto siguen vivas.

Esto da confianza en los caminos felices y en el modelo de acceso, pero **no
sustituye tests** (ver deuda #13).

---

## 9. Limitaciones conocidas y deuda técnica

Ordenadas ~por impacto. Las marco con severidad para priorizar la revisión.

| # | Área | Descripción | Sev. |
|---|---|---|---|
| 1 | Realtime | La suscripción es **polling cada 3 s** (compara `JSON.stringify` completo). Simple y sin deps, pero: latencia hasta 3 s, N clientes × cada 3 s = carga, y O(n) por ciclo. **Supabase Realtime (websockets)** sería el upgrade natural. | Media |
| 2 | AuthZ | El código de evento es **capability-por-URL**, no identidad. No hay rol anfitrión vs. invitado: un invitado puede borrar items de su evento. Falta llave de anfitrión / cuentas. | **Alta** (para vender) |
| 3 | Secreto de evento | La seguridad depende de que el código (~60M combos) no se adivine ni se filtre. Sin TTL ni rotación. ¿Suficiente entropía? ¿firmar server-side? | Media |
| 4 | Concurrencia | **Votos de playlist con read-modify-write** (`{...actual, votos+1}`), no atómico → lost updates con votos simultáneos. Debería ser incremento atómico (RPC/`votos = votos + 1`) o tabla de votos. | Media |
| 5 | Storage huérfano | `subirArchivo` + `guardar` son 2 pasos no transaccionales; y `eliminar` borra la fila de `items` pero **no** el archivo del bucket. Se acumulan huérfanos; sin job de limpieza. | Media |
| 6 | Validación | `dato` jsonb acepta cualquier forma. RLS solo valida evento y tamaño. Un cliente con código válido puede escribir JSON arbitrario. Zod solo corre en cliente (y `@salones/sync` ni eso). | Media |
| 7 | Imágenes/video | Compresión por canvas puede **ignorar la orientación EXIF** en algunos navegadores (fotos rotadas). Video **no** se comprime (crudo, ≤25 MB; un brindis de 60 s @2.5 Mbps ≈ 19 MB, cerca del límite). Sin thumbnails. | Baja/Media |
| 8 | Brindis desalineado | `brindis` es un **stack paralelo**: proyecto Supabase **distinto** (`ojtnzirtyxdpmsjfqixr`), usa el **SDK** `@supabase/supabase-js` (no REST), bucket `brindis`, **llaves hardcodeadas** como fallback en el código, env con **otro nombre** (`NEXT_PUBLIC_SUPABASE_KEY` vs `..._ANON_KEY`), render de video con **Shotstack** (API route server-side), y **no** usa `@salones/sync` ni `?e=` ni el candado de la Fase 5. Consume un 2º proyecto Free. Candidato a unificar. | Media |
| 9 | Sin tests / CI | No hay unit/integration/e2e ni gate de typecheck en CI (solo `turbo lint`). | Media |
| 10 | Paquetes sin build | `@salones/sync` se consume como fuente TS; no se typechequea aislado (`tsc --noEmit`) ni tiene tests propios. | Baja |
| 11 | Manejo de errores | El polling se traga los errores en silencio; una mala config de RLS se ve como UI vacía sin señal. Los `catch {}` ocultan causas. | Baja |
| 12 | Código muerto | `export const EVENTO_ID = "demo"` quedó en 5 libs (muro, playlist, rsvp, dinámicas, álbum) tras migrar a `eventoActual()`. Ya no se usa. Limpieza. | Trivial |
| 13 | Multi-tab local | En modo local, borrar/guardar avisa a la misma pestaña vía un `Set` de escuchas además de `BroadcastChannel`. Funciona, pero es lógica sutil que conviene testear. | Baja |

**Lo que sí quedó bien (para balancear):** la abstracción provider es limpia y
extensible; el progressive enhancement mapea 1:1 al modelo de negocio; el server
provider es cero-dependencias; el aislamiento entre eventos se hace en la BD (no
solo en el cliente); y el dominio comparte un solo vocabulario tipado (`@salones/core`).

---

## 10. Preguntas concretas para el revisor

1. **Realtime:** ¿vale la pena migrar de polling a Supabase Realtime ya, o el
   polling de 3 s aguanta el volumen esperado (decenas de invitados por evento)?
2. **AuthZ (#2):** para vender contratos, ¿cuál es el mínimo aceptable —
   llave-de-anfitrión separada, Supabase Auth con cuentas, o edge functions
   firmando tokens por evento? ¿Qué harías primero?
3. **Entropía del código (#3):** ¿5 chars base36 tras el slug es suficiente, o
   subimos longitud / agregamos verificación server-side?
4. **Votos (#4):** ¿incremento atómico por RPC, o rediseñar a tabla de votos con
   `count`? ¿Importa a esta escala?
5. **Huérfanos de Storage (#5):** ¿trigger de Postgres que borre el objeto al
   borrar la fila, edge function, o job programado?
6. **Validación (#6):** ¿constraints/`CHECK` en la BD, un edge function como
   gateway, o basta validar en cliente para este caso de uso?
7. **Brindis (#8):** ¿unificar bajo `@salones/sync` + un solo proyecto Supabase,
   o dejarlo aparte por lo del render con Shotstack?
8. **Modelo de "una tabla para todo":** ¿la tabla única `items(evento, coleccion,
   dato jsonb)` te parece bien para esta escala, o preferirías tablas por dominio?

Cualquier otra cosa que saltes a la vista, bienvenida. Gracias por la revisión.
