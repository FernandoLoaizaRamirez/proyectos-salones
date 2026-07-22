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

## 🛑 Que no se reconstruyan las 14 apps en cada cambio

**El problema.** Cada app es un proyecto de Vercel aparte, pero todas viven en el
mismo repositorio. Sin freno, **cualquier** cambio dispara las 14 construcciones.
El 20 jul 2026 esto agotó la cuota diaria del plan gratis: se subió un cambio que
solo tocaba **4 archivos de documentación** y Vercel construyó **13 apps**, ninguna
de las cuales había cambiado ni una línea.

**El freno.** Cada app trae un [`vercel.json`](../apps/muro/vercel.json) con:

```json
{ "ignoreCommand": "node ../../scripts/vercel-construir-si-cambio.mjs" }
```

Vercel corre ese comando **antes** de construir. El guion
[`scripts/vercel-construir-si-cambio.mjs`](../scripts/vercel-construir-si-cambio.mjs)
compara los archivos que cambiaron desde la última construcción buena **de esa
app** y decide:

| Qué cambió | Qué pasa |
|---|---|
| Algo de la propia app | 🔨 construye |
| Un paquete del que depende (incluso indirecto) | 🔨 construye |
| Configuración de la raíz (`pnpm-lock.yaml`, `turbo.json`…) | 🔨 construye todas |
| Documentación, otra app, un paquete que no usa | ⏭ se salta |
| **Cualquier duda o error** | 🔨 **construye** |

Ejemplo real: `invitaciones` solo depende de `@salones/config`, así que un cambio
en `@salones/ui` **no** la reconstruye. `muro`, que sí usa `ui`, sí.

> **Regla de oro del guion: ante la duda, construir.** Construir de más cuesta
> cuota; saltarse una construcción necesaria deja una app vieja en producción, que
> es mucho peor. Por eso todo camino de error acaba en "construir" — incluido el
> caso de que el guion ni siquiera se encuentre.

**Requisito.** El **Root Directory** de cada proyecto en Vercel debe ser
`apps/<nombre>` (como dice el paso 2). Si estuviera puesto en la raíz del
repositorio, el guion no se encuentra, falla, y Vercel construye igual: no se
rompe nada, simplemente no ahorra.

**Para comprobar que está funcionando:** en el registro de una construcción
saltada, Vercel muestra la línea `⏭ SALTAR — …` con el motivo.

## Notas

- El nombre de la marca sale de `NEXT_PUBLIC_BRAND_NAME` (opcional; por defecto usa
  "Hacienda Santa Renata"). Se puede cambiar en Vercel → Settings → Environment
  Variables, sin tocar código.
- Las fotos de la demo son de Unsplash (uso comercial libre). Para un cliente real
  se ponen sus propias fotos (editando `apps/sitio-salon/src/lib/salon.ts`).
- El plan gratuito (Hobby) de Vercel alcanza para una demo/portafolio. Para uso
  comercial formal, su plan Pro ronda ~$20 USD/mes.
