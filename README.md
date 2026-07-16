# Proyectos Salones

Suite modular de aplicaciones para salones de eventos (bodas, XV años, corporativos).

Cada aplicación **funciona por sí sola** y, cuando el cliente contrata varias,
**trabajan mejor juntas** sin depender unas de otras.

Todas están publicadas y en vivo. La vitrina de venta que las reúne es el
**catálogo**: **https://suite-salones.vercel.app**

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
> demos) junta en un solo lugar lo que mandan muchos teléfonos: hoy el muro, la
> playlist, el RSVP y el ranking de dinámicas; fotos y video vienen en camino.

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
│   └── catalogo/         # Vitrina-tienda que reúne todo (suite-salones)
├── packages/             # Piezas compartidas (los "cimientos")
│   ├── config/           # Reglas comunes (TypeScript, formato)
│   ├── ui/               # Sistema de diseño (la cara de la familia)
│   └── core/             # Vocabulario común de datos (Evento, Invitado…)
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

- ✅ Cimientos: reglas comunes, sistema de diseño y vocabulario de datos.
- ✅ **12 aplicaciones** construidas, publicadas en Vercel y enlazadas en el catálogo.
- ✅ Catálogo-tienda con precios en 3 modelos (gestionado / renta / compra) y paquetes.
- ✅ **Servicio gestionado (fases 1 y 2) en producción**: servidor central
  (Supabase) encendido; el Muro, la Playlist, el RSVP y el ranking de Dinámicas
  ya juntan el contenido de muchos teléfonos en vivo.
- ⏳ Pendiente: fase 3 del gestionado (fotos del álbum y videos del brindis),
  fase 4 (un QR por evento, cuentas y moderación) y un dominio propio con
  **subdominios**.

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — cómo está armado todo por dentro.
- [`docs/SERVICIO-GESTIONADO.md`](docs/SERVICIO-GESTIONADO.md) — el "lugar central" que junta el contenido de muchos teléfonos.
- [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) — cómo se publica cada app en Vercel.
- [`docs/GUIA-WHITE-LABEL.md`](docs/GUIA-WHITE-LABEL.md) — cómo personalizar una app con los datos de un cliente.
</content>
</invoke>
