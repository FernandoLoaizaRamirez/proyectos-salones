# Guía White-Label

Cómo adaptar la marca de un cliente y desplegar una app para él.

## 1. Nombre y logo

En el archivo `.env.local` de la app (copiado de `.env.example`):

```
NEXT_PUBLIC_BRAND_NAME="Nombre del Salón del Cliente"
# NEXT_PUBLIC_BRAND_LOGO_URL=https://...
```

## 2. Colores y tipografía

Edita `packages/ui/src/styles/tokens.css`. Cambia los valores de:

- `--primary` / `--primary-fg` → color principal de la marca.
- `--accent` / `--accent-fg` → color de acento (detalles, foco).
- `--bg` / `--fg` → fondo y texto.
- `--surface` → franjas y fondos destacados (se deriva sola de fondo y texto).
- `--font-sans` → tipografía del texto corrido.
- `--font-display` / `--font-script` → tipografía editorial (títulos,
  monogramas y frases de la experiencia del invitado).
- `--radius` → qué tan redondeadas se ven las esquinas.

Hay un bloque para tema claro (`:root`) y otro para tema oscuro (`.dark`).
Al cambiarlos, **toda la suite se recolorea sola**… con dos excepciones que no
leen estos tokens: `apps/sitio-salon` y `apps/invitaciones` tienen su paleta
propia en su `globals.css` (a propósito: son piezas de diseño cerradas).

> Desde el rediseño, la marca REAL de cada salón no vive aquí sino en la base
> (`tenant_branding`, y por evento `event_branding`): estos tokens son solo el
> tema neutro de fábrica sobre el que aquélla se pinta en runtime.

## 3. Desplegar

Cada app se despliega sola (compatible con Vercel). No necesita el resto del
monorepo en producción.

## 4. Modo de venta

Se controla con la variable `APP_MODE` (`MANAGED`, `RENTAL` u `OWNED`).
La validación de licencia y los cobros se conectan en una etapa posterior.
