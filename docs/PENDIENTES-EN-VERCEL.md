# Ajustes en Vercel — estado (24 jul 2026)

Todo el código está en `main` y desplegado. De los 3 ajustes de panel, **2 ya
están hechos y verificados en vivo**; queda 1.

| # | Ajuste | Estado |
|---|---|---|
| 1 | Variables del **brindis** | ✅ HECHO y verificado (9 peticiones al servidor) |
| 2 | Crear el **portal** | ✅ HECHO y verificado (`proyectos-salones-portal.vercel.app`) |
| 3 | `NEXT_PUBLIC_PORTAL_URL` en el **catálogo** | ✅ HECHO y verificado |
| 4 | `NEXT_PUBLIC_SITIO_SALON_URL` en el **portal** | ✅ HECHO y verificado en vivo (21 ago 2026) |

Las dos variables públicas usadas arriba (no marcar "Sensitive"):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cpbfisylcquuahrmyaca.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_G0gt2CGUOrmVEjK8bMX0mA_Qqrzsuwj` |

---

## ✅ 1. Brindis — HECHO (24 jul)

Se añadieron las dos variables al proyecto `proyectos-salones-brindis` y se forzó
un rebuild. Verificado en vivo: la galería hace **9 peticiones al servidor real**
y el botón "Enviar a los novios" ya aparece. Modo servidor confirmado.

> 🪤 **Trampa encontrada (importante para el futuro):** añadir las variables y
> darle **Redeploy al mismo commit NO funciona** — el portero
> (`scripts/vercel-construir-si-cambio.mjs`) ve que no cambió ningún archivo y
> **cancela el build en 1 s** (*Canceled*). El bundle no recoge las variables.
> Se arregla con un **commit que toque la carpeta de esa app** (así el portero la
> reconstruye y las demás saltan). Se hizo con el commit `0e926b4` (una nota al
> README del brindis). Documentado también en `apps/brindis/README.md`.

## ✅ 2. Portal — HECHO (24 jul)

Creado el proyecto **`proyectos-salones-portal`** (Root Directory `apps/portal`,
Next.js, las dos variables públicas, Production+Preview). Vercel detectó el
monorepo con Turborepo (`turbo run build`), así que no hizo falta la casilla de
"incluir archivos fuera de la carpeta". Verificado en vivo: **6 peticiones al
servidor**, el muro del portal muestra mensajes reales, y la home resuelve el
evento demo por la Edge Function `evento-config`.
- Nota: el nombre quedó `proyectos-salones-portal` (Vercel lo regeneró al elegir
  la carpeta), coherente con las otras apps. URL: `proyectos-salones-portal.vercel.app`.

---

## ✅ 3. Enganchar el panel al portal — HECHO (24 jul)

Se puso `NEXT_PUBLIC_PORTAL_URL = https://proyectos-salones-portal.vercel.app` en
el proyecto `suite-salones` (Production + Preview) y se forzó el rebuild con el
commit `5a3166d` (tocó `apps/catalogo`, para esquivar la trampa del portero).

**Verificado en vivo** (con la sesión de Fernando, en el tablero del evento de
prueba `boda-citla-oxfmm`): el aviso naranja desapareció y ahora sale
*"El enlace para tus invitados: https://proyectos-salones-portal.vercel.app/?e=boda-citla-oxfmm"*,
con botones de copiar y enviar por WhatsApp. Los enlaces del panel ya van al portal.

---

## 🎉 LOS 3 AJUSTES DE VERCEL: COMPLETOS

Brindis conectado, portal publicado, panel enganchado al portal. Todo el trabajo
de despliegue de la suite queda cerrado. Lo siguiente del proyecto ya no es Vercel:
son los **cortes** (bloque E, ver `docs/GUION-DEL-CORTE.md`) y lo **legal** (bloque F).

### Nota de proceso: cómo se hicieron
Claude los hizo directamente en el Chrome de Fernando, con la técnica de **pegar**
los valores (`form_input`) en vez de teclear, y verificando con captura tras cada
paso. Así NO se repitió el incidente de la primera vez.

### Antecedente: el incidente de la primera vez
La primera vez (23 jul) se intentó **tecleando** los valores; el foco no entró en
el campo y las teclas se fueron como atajos, abriendo la pantalla de 2FA de la
cuenta (se salió con Escape, sin cambiar nada). La solución fue usar **pegar por
referencia del campo** (`form_input`) y verificar con captura tras cada paso. Con
eso, los pasos 1 y 2 salieron limpios.

---

## ✅ 4. `NEXT_PUBLIC_SITIO_SALON_URL` en el portal — HECHO (21 ago 2026)

Desde el commit `af7ee5f`, la cabecera del portal enseña la marca del salón y
**enlaza de vuelta a su web** (`apps/portal/src/components/marca-salon.tsx`).

| Proyecto de Vercel | Nombre | Valor | Entornos | ¿Sensitive? |
|---|---|---|---|---|
| `proyectos-salones-portal` | `NEXT_PUBLIC_SITIO_SALON_URL` | `https://salones-teal.vercel.app` | Production and Preview | NO |

Añadida por el panel y **redesplegada** (`Bhv6i7jwH4TYMWTV2MLQwJ6tSZk6`, Ready en
37 s). Verificado en vivo sobre `proyectos-salones-portal.vercel.app/?e=demo`: la
marca es un `<a>` que apunta a `https://salones-teal.vercel.app`, el color del
salón da **6.79:1** de contraste y quedan **0** degradados arcoíris.

> 🪤 **La trampa vieja del Redeploy YA NO APLICA — corregir la nota de arriba.**
> Hasta el 16 ago, darle *Redeploy* al mismo commit se cancelaba: el portero veía
> cero archivos cambiados y saltaba. El commit `c16f7f2` invirtió esa regla
> (cero archivos = CONSTRUIR, porque "no me consta que haya algo que hacer" no es
> "no hay nada que hacer"). Comprobado a mano antes de darle:
>
> ```
> VERCEL_GIT_PREVIOUS_SHA=af7ee5f VERCEL_GIT_COMMIT_SHA=af7ee5f node scripts/vercel-construir-si-cambio.mjs
> ✓ CONSTRUIR — no veo ningún archivo cambiado: puede que la app en vivo esté atrasada
> ```
>
> **Consecuencia práctica: para recoger una variable nueva ya NO hace falta
> empujar un commit vacío.** Basta con *Redeploy* dejando "Use existing Build
> Cache" DESMARCADO. Cuesta 1 construcción en vez de las ~13 que gasta un commit
> que toque `scripts/` o un paquete compartido.

**El camino definitivo sigue pendiente.** Esta variable vale mientras haya UN
salón. Con dos clientes, cada evento necesita apuntar a la web de SU salón, y eso
ya está previsto: `BrandingSalon.sitioUrl` (`packages/ui/src/branding.ts`) manda
sobre la variable de entorno. Falta la columna en `tenant_branding` y devolverla
en la Edge Function `evento-config`, al lado de `logoUrl`.
