# Brindis en video

El invitado graba un mensaje corto en video para los novios desde su teléfono.
El anfitrión los ve todos juntos en `/galeria` y puede fusionarlos en un **video
recuerdo** (portada + todos los brindis + música) con Shotstack.

## Cómo se conecta (igual que el resto de la suite)

Esta app usa **`@salones/sync`**, la costura común de todas las apps, con su
interruptor automático:

| Sin `NEXT_PUBLIC_SUPABASE_*` | Con `NEXT_PUBLIC_SUPABASE_*` |
|---|---|
| Modo **LOCAL** | Modo **SERVIDOR** (Servicio gestionado) |
| El video se queda en el teléfono del invitado (galería con IndexedDB) y se comparte por WhatsApp. | Cada brindis sube al almacenamiento central y aparece en la galería del anfitrión, en vivo. |
| El botón “Enviar a los novios” no aparece: no hay a dónde enviar. | El botón “Enviar a los novios” manda el video al evento. |

Las variables van en `.env.local` (ver [`.env.example`](.env.example)) y en las
variables de entorno de Vercel. Son **las mismas** que usan el muro, la playlist,
el RSVP y el álbum: un solo proyecto de Supabase para toda la suite.

## Aislamiento por evento

Cada evento vive en su propia burbuja gracias al código del enlace:

```
/          → evento "demo" (las vitrinas públicas)
/?e=boda-garcia-x7k2   → esa boda, y solo esa
```

Los brindis se guardan en la colección `brindis` de ese evento, el QR de
“Compartir” propaga el código solo, y el **video recuerdo** junta únicamente los
brindis del evento que se le pide (el navegador se lo manda a
`POST /api/recuerdo` en el cuerpo, porque el servidor no ve el enlace).

Los códigos se crean en el generador del operador:
`suite-salones.vercel.app/evento`.

## El peso del video

El cajón central corta en **25 MB** por archivo. La grabación se fija a 1.8 Mbps
de video + 96 kbps de audio (`VIDEO_BPS` y `AUDIO_BPS` en `src/lib/brindis.ts`),
así que el brindis más largo posible —60 s— pesa **~14 MB**: entra con margen y
sube rápido incluso con los datos del teléfono del invitado.

Esa calidad es solo una **sugerencia** al navegador, y algunos (Safari en
iPhone) la ignoran y graban mucho más pesado. Por eso `subirBrindis` pesa el
archivo antes de mandarlo y, si se pasa, avisa al invitado que grabe uno más
corto en vez de dejar que el servidor lo rechace con un error críptico.

El video **no se re-comprime** después de grabar, a diferencia de las fotos del
álbum. Re-codificar un video en el teléfono tarda minutos y quema batería; era
peor remedio que la enfermedad. Bajar la tasa al grabar sale gratis.

## Decisión: los videos viejos se dan por perdidos

Hasta esta versión, `brindis` era un **silo aparte** del resto del monorepo:

- hablaba con **otro proyecto de Supabase** (`ojtnzirtyxdpmsjfqixr`), con la URL
  y la llave **escritas en el código** como respaldo;
- usaba el SDK `@supabase/supabase-js` en vez de `@salones/sync`;
- guardaba en un cajón propio llamado `brindis`;
- leía la variable `NEXT_PUBLIC_SUPABASE_KEY`, distinta del resto de la suite
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY`);
- y **no** separaba por evento: todos los brindis de todas las bodas caían en el
  mismo montón.

Al migrar, los videos que ya estaban en ese proyecto viejo **se dan por
perdidos**: eran **contenido de demostración**, no de un cliente real. No se
migran a propósito, porque:

1. No hay nada que rescatar: son grabaciones de prueba de las vitrinas públicas.
2. Migrarlos exigiría mantener vivo el proyecto viejo (y su segundo plan Free)
   solo para copiar archivos desechables.
3. Al no traerlos, **la llave que estaba escrita en el código queda muerta** y se
   puede rotar o borrar el proyecto viejo sin tocar una sola línea. Ese era el
   punto de la migración.

Consecuencia práctica: la galería arranca vacía y se vuelve a llenar en cuanto
los invitados graban. Si algún día hiciera falta un video viejo, sigue estando en
el panel de Supabase del proyecto anterior hasta que se borre a mano.
