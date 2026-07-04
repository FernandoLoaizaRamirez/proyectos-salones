# Publicar en Vercel (gratis)

La app `apps/sitio-salon` (demo del salón) es un sitio Next.js estático, ideal para
Vercel. Tiene dos versiones: `/` (clásica) y `/premium` (inmersiva con WebGL).

## Pasos (una sola vez)

1. **Sube el código a GitHub**
   - Crea un repositorio nuevo (privado) en github.com.
   - Conéctalo y sube este monorepo (rama `main`).

2. **Crea el proyecto en Vercel**
   - Entra a vercel.com → "Add New… → Project" → importa el repositorio de GitHub.
   - **IMPORTANTE (es un monorepo):** en "Root Directory" elige **`apps/sitio-salon`**.
   - Framework: Next.js (se detecta solo). Gestor de paquetes: pnpm (se detecta solo).
   - Clic en **Deploy**.

3. **Listo**
   - Vercel te da una dirección gratis tipo `hacienda-santa-renata.vercel.app`.
   - Cada vez que subas cambios a GitHub, Vercel vuelve a publicar solo.

## Después: un dominio con subdominios

- En el proyecto → **Settings → Domains** agregas tu dominio o subdominio
  (ej. `salon.tudominio.com`). Los subdominios en Vercel **no cuestan extra**:
  un solo dominio puede servir tu página personal y la del salón.

## Notas

- El nombre de la marca sale de `NEXT_PUBLIC_BRAND_NAME` (opcional; por defecto usa
  "Hacienda Santa Renata"). Se puede cambiar en Vercel → Settings → Environment
  Variables, sin tocar código.
- Las fotos de la demo son de Unsplash (uso comercial libre). Para un cliente real
  se ponen sus propias fotos (editando `apps/sitio-salon/src/lib/salon.ts`).
- El plan gratuito (Hobby) de Vercel alcanza para una demo/portafolio. Para uso
  comercial formal, su plan Pro ronda ~$20 USD/mes.
