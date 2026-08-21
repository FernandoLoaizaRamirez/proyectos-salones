# Fuente de la tarjeta de WhatsApp

`CormorantGaramond-SemiBoldItalic.woff` — Cormorant Garamond, itálica, peso 600.
Descargada de Google Fonts (fonts.gstatic.com), licencia SIL Open Font License 1.1.

**Por qué está aquí y no se pide por internet:** es la misma fuente que el sitio
usa para los títulos (ver `src/app/layout.tsx`), pero la tarjeta de Open Graph se
dibuja EN EL SERVIDOR, y ahí no existe ninguna fuente del sistema: sin este
archivo, el nombre del salón salía en la sans-serif por defecto — justo la letra
que la marca no usa. Bajarla en cada construcción sería una dependencia de red
para algo que nunca cambia.

**Formato WOFF, no WOFF2:** satori (el motor que dibuja la tarjeta) acepta ttf,
otf y woff, pero NO woff2. Si algún día se reemplaza este archivo, comprobar la
cabecera: debe ser `wOFF` (77 4f 46 46), no `wOF2`.
