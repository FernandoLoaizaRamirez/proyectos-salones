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
- `--bg` / `--fg` → fondo y texto.
- `--font-sans` → tipografía.
- `--radius` → qué tan redondeadas se ven las esquinas.

Hay un bloque para tema claro (`:root`) y otro para tema oscuro (`.dark`).
Al cambiarlos, **toda la suite se recolorea sola**.

## 3. Desplegar

Cada app se despliega sola (compatible con Vercel). No necesita el resto del
monorepo en producción.

## 4. Modo de venta

Se controla con la variable `APP_MODE` (`MANAGED`, `RENTAL` u `OWNED`).
La validación de licencia y los cobros se conectan en una etapa posterior.
