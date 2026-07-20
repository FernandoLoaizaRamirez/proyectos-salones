# Arquitectura

> **Actualizado el 20 de julio de 2026** contra la rama `main`. Este documento se
> escribió cuando solo existía una app; las tablas de abajo ya reflejan las 14.

## Los dos pilares

1. **Cada app funciona sola y completa.** Si un cliente compra una sola, esa app
   corre aislada, con sus propios datos, sin depender de nada más.
2. **Todas trabajan mejor juntas.** Cuando se activa la integración, comparten el
   mismo evento; si no, cada una usa sus datos locales. Nunca fallan por falta de
   otra app (**degradación elegante**).

## Piezas

### Cimientos (`packages/`)

Los **cinco que existen hoy** en `packages/`:

| Paquete | Qué es | Estado |
| --- | --- | --- |
| `@salones/config` | Reglas comunes (TypeScript, formato). Garantiza que todo se escriba igual. | ✅ |
| `@salones/ui` | Sistema de diseño: colores, tipografía, botones, tema claro/oscuro, marca. Desde la Fase 3, el branding de cada salón se aplica **en runtime** por variables CSS. | ✅ |
| `@salones/core` | Vocabulario común de datos (`Evento`, `Invitado`, `Mesa`…), más la **tenencia** (`Tenant`, `Role`) y el motor puro de `resolveEntitlements`. | ✅ |
| `@salones/sync` | El "lugar central". Una sola interfaz (`ProveedorSync`) con dos implementaciones: **local** (`localStorage`, modo demo/renta/compra) y **servidor** (Supabase por REST, modo gestionado). Se elige sola según haya credenciales. | ✅ |
| `@salones/payments` | Stripe: mapeo de planes y lógica pura del webhook. El paquete es lógica pura; **el interruptor está en quien lo llama** — la ruta `apps/catalogo/.../stripe/webhook`, que corta antes de tocar Stripe si `PAGOS_ACTIVOS !== "true"`. Hoy está en `false`: **no cobra nada**. | ✅ |

Y los que **nunca se construyeron**, para que no se busquen:

| Paquete | Qué pasó |
| --- | --- |
| `@salones/licensing` | No existe. Su parte de cobros la absorbió `@salones/payments`; la de licencias/planes vive en `@salones/core` (`entitlements.ts`) y en las tablas `plans` / `tenant_entitlements`. |
| `@salones/integrations` | No existe. La integración entre apps acabó resolviéndose por `@salones/sync` (todas hablan con el mismo evento) y no hizo falta una capa aparte. |

> `@salones/legal` (los tres documentos legales) está construido pero **aún no
> fusionado**: viene en el PR #17.

### Apps (`apps/`)

**14 carpetas.** Las 12 vendibles, el catálogo y el portal:

| App | Qué es | Estado |
| --- | --- | --- |
| `sitio-salon` | Sitio web del salón (clásico + premium). | ✅ |
| `album-fotos` | Álbum compartido de fotos y videos. App de referencia y molde. | ✅ |
| `invitaciones` | Invitación digital. | ✅ |
| `rsvp` | Confirmación de asistencia. | ✅ |
| `pases-qr` | Pases con QR y control de acceso. | ✅ |
| `mesas` | Acomodo de mesas. | ✅ |
| `muro` | Muro de mensajes / libro de firmas. | ✅ |
| `playlist` | Playlist colaborativa con votos. | ✅ |
| `photobooth` | Photobooth con cámara y marcos. | ✅ |
| `mi-mesa` | Buscador de "¿en qué mesa me toca?". | ✅ |
| `dinamicas` | Trivia, bingo y rompehielos. | ✅ |
| `brindis` | Brindis en video. **Stack aparte**: otro proyecto de Supabase, no usa `@salones/sync`. | ✅ (a unificar) |
| `catalogo` | Vitrina de venta **y** panel del salón: login del staff, alta de eventos, tablero por evento. | ✅ |
| `portal` | Portal del invitado (Fase 2): un solo enlace desde el que abren los 5 módulos por dentro. | ✅ |

**Quién habla con el servicio gestionado.** Siete apps declaran `@salones/sync`:
las **cinco del invitado** (muro, playlist, RSVP, dinámicas y álbum) más el
**portal** y el **catálogo**, que leen ese mismo contenido para armar el portal y
los tableros del salón. Las otras siete (sitio-salon, invitaciones, pases-qr,
mesas, mi-mesa, photobooth, brindis) **no** dependen del servidor central:
funcionan solas en el teléfono. El `brindis` sí usa la nube, pero la suya.

## Cómo se re-tematiza (white-label)

Toda la marca vive en dos lugares:

- **Colores, tipografía y redondeado:** `packages/ui/src/styles/tokens.css`.
- **Nombre y logo:** variables de entorno `NEXT_PUBLIC_BRAND_NAME` (y logo).

Cambiar eso recolorea y re-marca toda la suite sin tocar el código de las apps.
Ver `GUIA-WHITE-LABEL.md`.

**Además, desde la Fase 3 (semilla):** el branding **por salón** se aplica en
runtime. La marca del salón se guarda en la base (migración `0007_branding.sql`)
y `@salones/ui` la inyecta como variables CSS al vuelo, así que dos salones
distintos ven colores distintos **con el mismo despliegue**. El camino de arriba
(recompilar con otros tokens) sigue sirviendo para un white-label de verdad, con
su propio dominio.

## Decisión de arranque — ⚠️ ya superada

> **Nota del 20 jul 2026.** Lo que sigue explica **por qué se arrancó así**, pero
> **ya no describe el estado**: la maquinaria comercial se construyó en las
> Fases 0 y 1 (ver [`FASE-0-1-PLATAFORMA.md`](FASE-0-1-PLATAFORMA.md)). Hoy
> existen el plano de control (`tenants`, `plans`, `features`, entitlements), el
> login del staff, el candado por salón y rol, y los cobros cableados pero
> apagados. Se deja el párrafo como registro de la decisión original.

La maquinaria comercial (cobros, licencias, multi-cliente) **se construye después**,
cuando haya una app funcionando que se vaya a vender. Por ahora se le deja su lugar
reservado en la estructura para que entre limpia, sin parches. Esto evita gastar
tiempo y dinero en infraestructura antes de tener el producto en el mostrador.
