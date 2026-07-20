# Proyectos Salones

Suite modular de aplicaciones para salones de eventos (bodas, XV años, corporativos).

Cada aplicación **funciona por sí sola** y, cuando el cliente contrata varias,
**trabajan mejor juntas** sin depender unas de otras.

Las **12 apps de la suite** están publicadas y en vivo. La vitrina de venta que
las reúne es el **catálogo**: **https://suite-salones.vercel.app**

> **Estado (20 jul 2026).** El repo tiene **14 carpetas en `apps/`**: las 12 apps
> vendibles de abajo, más el **catálogo** (la vitrina y el panel del salón) y el
> **portal del invitado** (`apps/portal`, la Fase 2 de la plataforma). El portal
> es reciente y **todavía no tiene dirección pública fija** —se configura con
> `NEXT_PUBLIC_PORTAL_URL`—, así que no aparece en la tabla de demos.
> Ver [Estado actual](#estado-actual).

## Las aplicaciones

### Base del evento

| App | Qué hace | En vivo |
|-----|----------|---------|
| **Sitio web del salón** | Página profesional del salón, con versión clásica y una premium inmersiva. | [Ver demo](https://salones-teal.vercel.app) · [/premium](https://salones-teal.vercel.app/premium) |
| **Álbum de fotos** | Los invitados suben fotos y videos con un QR; todos los ven y descargan. | [Ver demo](https://album-fotos-gamma.vercel.app) |
| **Invitaciones digitales** | Invitación web elegante con mapa, cuenta regresiva y confirmación. | [Ver demo](https://invitaciones-weld.vercel.app) |
| **Confirmación (RSVP)** | Los invitados confirman en línea; tú ves la lista en tiempo real. | [Ver demo](https://rsvp-umber-pi.vercel.app) |
| **Pases con QR y check-in** | Cada invitado recibe un pase con QR que se escanea en la entrada. | [Ver demo](https://pases-qr.vercel.app) |

### Experiencias para los invitados ✨ nuevas

| App | Qué hace | En vivo |
|-----|----------|---------|
| **Acomodo de mesas** | Organiza quién se sienta en cada mesa arrastrando a los invitados; se comparte por enlace/QR. | [Ver demo](https://proyectos-salones-mesas.vercel.app) |
| **Muro de mensajes** | Libro de firmas digital: mensaje, firma y foto, con "modo pantalla" para proyectar. | [Ver demo](https://proyectos-salones-muro.vercel.app) |
| **Playlist colaborativa** | Los invitados piden canciones y votan; el DJ ve la lista por votos. | [Ver demo](https://proyectos-salones-playlist.vercel.app) |
| **Photobooth digital** | Foto con la cámara del teléfono, marco del evento, y descargar o compartir. | [Ver demo](https://proyectos-salones-photobooth.vercel.app) |
| **¿En qué mesa me toca?** | El invitado escribe su nombre y encuentra su mesa y con quién se sienta. | [Ver demo](https://proyectos-salones-mi-mesa.vercel.app) |
| **Dinámicas y juegos** | Trivia con ranking en vivo, bingo de boda y rompehielos desde el teléfono. | [Ver demo](https://proyectos-salones-dinamicas.vercel.app) |
| **Brindis en video** | Cada invitado graba un mensaje corto en video para los novios y lo comparte. | [Ver demo](https://proyectos-salones-brindis.vercel.app) |

> Las **7 apps nuevas** (mesas, muro, playlist, photobooth, mi-mesa, dinámicas y
> brindis) usan la cámara y el micrófono del propio teléfono y funcionan solas en
> cada dispositivo. Además, el **servicio gestionado** (ya encendido en las
> demos) junta en un solo lugar lo que mandan muchos teléfonos: el muro, la
> playlist, el RSVP, el ranking de dinámicas **y las fotos del álbum**.
>
> El **brindis** guarda sus videos aparte, en su propio proyecto de Supabase, y
> **no** pasa por el servicio gestionado (ver deuda #8 en
> [`docs/REVISION-TECNICA.md`](docs/REVISION-TECNICA.md)).

## Estructura

```
Proyectos-Salones/
├── apps/                 # Aplicaciones (cada una se despliega sola)
│   ├── sitio-salon/      # Sitio web del salón (clásico + premium)
│   ├── album-fotos/      # Álbum de fotos y videos del evento
│   ├── invitaciones/     # Invitación digital
│   ├── rsvp/             # Confirmación de asistencia
│   ├── pases-qr/         # Pases con QR y control de acceso
│   ├── mesas/            # Acomodo de mesas (drag & drop)
│   ├── muro/             # Muro de mensajes / libro de firmas
│   ├── playlist/         # Playlist colaborativa con votos
│   ├── photobooth/       # Photobooth con cámara y marcos
│   ├── mi-mesa/          # Buscador de "¿en qué mesa me toca?"
│   ├── dinamicas/        # Trivia, bingo y rompehielos
│   ├── brindis/          # Brindis en video
│   ├── catalogo/         # Vitrina-tienda + panel del salón (suite-salones)
│   └── portal/           # Portal del invitado: los 5 módulos en un solo enlace
├── packages/             # Piezas compartidas (los "cimientos")
│   ├── config/           # Reglas comunes (TypeScript, formato)
│   ├── ui/               # Sistema de diseño (la cara de la familia)
│   ├── core/             # Vocabulario común de datos (Evento, Invitado…)
│   ├── sync/             # El "lugar central": local o servidor, misma interfaz
│   └── payments/         # Cobros con Stripe (cableados pero APAGADOS)
├── supabase/             # Migraciones SQL y Edge Functions del servidor
└── docs/                 # Documentación
```

## Cómo arrancar (en local)

```bash
pnpm install          # instala todo una sola vez
pnpm dev              # levanta las apps en modo desarrollo
```

Cada app corre en su propio puerto. Para trabajar en una sola:

```bash
pnpm --filter photobooth dev     # solo el photobooth
pnpm --filter photobooth build   # compilar una app
```

> **Nota:** las apps de cámara y micrófono (photobooth, brindis) y el escáner de
> pases necesitan una dirección segura (HTTPS) para funcionar. En las demos de
> Vercel ya funcionan; en local se prueban mejor desde `localhost`.

## Estado actual

> Medido contra la rama `main` el **20 de julio de 2026**. Lo marcado como
> pendiente está construido pero **en Pull Requests todavía sin fusionar**, o
> aplicado a medias en Supabase.
>
> ⚠️ **"Fusionado" no quiere decir "desplegado".** Ese día se agotó la cuota de
> Vercel, así que lo que entró a `main` en las últimas rondas **puede no estar
> todavía en vivo**. Las demos de arriba llevan tiempo publicadas; el portal y el
> panel del anfitrión son lo más reciente.

### Ya está hecho y fusionado

- ✅ Cimientos: `config`, `ui`, `core`, **`sync`** (el lugar central) y
  **`payments`** (Stripe cableado pero apagado por bandera).
- ✅ **14 carpetas en `apps/`**: las 12 apps vendibles + catálogo + portal.
- ✅ Catálogo-tienda con precios en 3 modelos (gestionado / renta / compra) y paquetes.
- ✅ **Servicio gestionado completo (fases 1 a 5)**: servidor central (Supabase)
  encendido; muro, playlist, RSVP, ranking de dinámicas **y fotos del álbum**;
  un evento por enlace (`?e=`) y aislamiento entre eventos hecho **en la base de
  datos** (RLS con el encabezado `x-evento`).
- ✅ **Plataforma, Fase 0**: plano de control en migraciones versionadas
  (`tenants`, `plans`, `features`, `entitlements`…).
- ✅ **Plataforma, Fase 1** salvo un paso: login del staff, RLS por salón y rol,
  alta de eventos autenticada, cobros listos-pero-apagados y pruebas de
  aislamiento en CI. **Falta el token firmado** (ver abajo).
- ✅ **Fase 2 — portal del invitado**: los 5 módulos (muro, playlist, RSVP,
  dinámicas, álbum) abren **dentro** de `apps/portal`, no como enlaces sueltos.
- ✅ **Fase 2b — panel del anfitrión**: `/eventos` y el tablero de cada evento.
  **2 de las 5 pantallas** (confirmaciones y muro proyectado) ya viven dentro.
- ✅ **Fase 3 (semilla)**: branding por salón con variables CSS en runtime.
- ✅ **58 pruebas automatizadas** y CI en cada push y PR.

### Construido pero pendiente de fusionar

| Qué | Dónde | Qué trae |
|---|---|---|
| **Pase firmado** | PR #4 · rama `feat/token-firmado` | Migración `0006`: el candado deja de ser la llave en crudo y pasa a un pase que caduca a los 30 min. |
| **Seguridad y operación** | PR #17 · rama `feat/llave-anfitrion` | Llave de anfitrión (`0009`), candado de subida de fotos (`0010`), fotos privadas (`0013`), diagnóstico (`0012`), capa legal y cierre de evento. |
| **Las 3 pantallas que faltan** | PRs #22 → #23 → #24 | Panel del DJ, tablero de juegos y álbum, dentro del panel. **Fusionar en ese orden** (van apilados). |

> ⚠️ Los runbooks de todo lo de arriba viven **en la rama de su PR**, no en
> `main`. La lista maestra para encender todo es `docs/ENCENDER-TODO.md`, en la
> rama del **PR #17**.

### Todavía sin construir

- ⏳ **Subdominios por salón** (`salon.suite-salones.app`) — la Fase 3 de verdad;
  hoy solo está reservado el campo `slug`.
- ⏳ **Planes de pago de la infraestructura**: Vercel Pro (el plan gratis prohíbe
  el uso comercial) y Supabase Pro (respaldos; el plan gratis da ~1 GB, que una
  sola boda con fotos y videos se come).
- ⏳ **Encendido en Supabase**: según la lista de encendido, medida contra el
  proyecto real el 20 jul 2026, faltaban migraciones por aplicar y Edge Functions
  por desplegar. *(El estado del servidor no se puede leer desde el repo; esa
  lista es la única fuente.)*

## Documentación

**Cómo está armado**

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — cómo está armado todo por dentro.
- [`docs/REVISION-TECNICA.md`](docs/REVISION-TECNICA.md) — estado técnico, decisiones y deuda conocida.
- [`docs/SERVICIO-GESTIONADO.md`](docs/SERVICIO-GESTIONADO.md) — el "lugar central" que junta el contenido de muchos teléfonos.

**La plataforma multi-cliente**

- [`docs/EVALUACION-VISION-PLATAFORMA.md`](docs/EVALUACION-VISION-PLATAFORMA.md) — la hoja de ruta a SaaS.
- [`docs/FASE-0-1-PLATAFORMA.md`](docs/FASE-0-1-PLATAFORMA.md) — el registro de lo construido en las fases 0 y 1.
- [`docs/RLS-TENANT-ROL.md`](docs/RLS-TENANT-ROL.md) — el candado por salón y rol (migración `0008`).
- [`docs/PORTAL-EVENTO-CONFIG.md`](docs/PORTAL-EVENTO-CONFIG.md) — la función que configura el portal del invitado.

**Operación**

- [`docs/ENCENDER-FASE-1.md`](docs/ENCENDER-FASE-1.md) — checklist para encender la Fase 1 en Supabase.
- [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) — cómo se publica cada app en Vercel.
- [`docs/GUIA-WHITE-LABEL.md`](docs/GUIA-WHITE-LABEL.md) — cómo personalizar una app con los datos de un cliente.
</content>
</invoke>
