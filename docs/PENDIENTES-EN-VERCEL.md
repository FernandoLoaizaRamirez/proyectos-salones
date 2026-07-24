# Ajustes en Vercel — estado (24 jul 2026)

Todo el código está en `main` y desplegado. De los 3 ajustes de panel, **2 ya
están hechos y verificados en vivo**; queda 1.

| # | Ajuste | Estado |
|---|---|---|
| 1 | Variables del **brindis** | ✅ HECHO y verificado (9 peticiones al servidor) |
| 2 | Crear el **portal** | ✅ HECHO y verificado (`proyectos-salones-portal.vercel.app`) |
| 3 | `NEXT_PUBLIC_PORTAL_URL` en el **catálogo** | ⏳ PENDIENTE (no urgente) |

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

## ⏳ 3. Enganchar el panel al portal — PENDIENTE (no urgente)

Sin esto, los enlaces y QR del panel del anfitrión apuntan a las **apps sueltas**
de siempre (hay respaldo puesto a propósito, así que **nada se rompe**). Con esto,
apuntan al portal.

**Qué hacer:**
1. Vercel → proyecto **`suite-salones`** → *Settings → Environment Variables*.

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_PORTAL_URL` | `https://proyectos-salones-portal.vercel.app` |

   (Production + Preview, no "Sensitive".)

2. ⚠️ **Ojo con la misma trampa del portero:** después de guardar la variable, un
   *Redeploy* del mismo commit se cancelará. Hay que forzar el rebuild con un
   **commit que toque `apps/catalogo/`**. Ese commit lo hace Claude cuando la
   variable esté puesta.

**Cómo saber que quedó:** en el tablero de un evento (`/eventos/<código>`),
desaparece el aviso naranja *"Falta configurar NEXT_PUBLIC_PORTAL_URL"* y el
enlace para invitados pasa a ser del portal.

---

## Por qué el paso 3 quedó pendiente hoy

Claude hizo los pasos 1 y 2 directamente en el Chrome (con la técnica de **pegar**
los valores en vez de teclear, que evita el incidente de la vez anterior). Al ir
a por el paso 3, **la extensión de Chrome se desconectó** (transitorio). El paso
se retoma en cuanto reconecte, o lo puede hacer Fernando con esta guía (es una
sola variable). El commit de rebuild lo pone Claude.

### Antecedente: el incidente de la primera vez
La primera vez (23 jul) se intentó **tecleando** los valores; el foco no entró en
el campo y las teclas se fueron como atajos, abriendo la pantalla de 2FA de la
cuenta (se salió con Escape, sin cambiar nada). La solución fue usar **pegar por
referencia del campo** (`form_input`) y verificar con captura tras cada paso. Con
eso, los pasos 1 y 2 salieron limpios.
