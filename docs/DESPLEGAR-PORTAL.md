# Poner el PORTAL del invitado en línea (primer despliegue)

El portal (`apps/portal`) es la pantalla que abre el invitado con el enlace del
evento: una sola página con los 5 módulos dentro (muro, playlist, confirmación,
dinámicas y álbum). **Es la única de las 14 apps que nunca se ha desplegado**:
tiene su `vercel.json` desde que se construyó, pero en Vercel no existe todavía
un proyecto que la publique.

Mientras no esté en línea, los enlaces que genera el panel del anfitrión caen en
las apps sueltas de siempre (hay un respaldo puesto a propósito para eso).

---

## Antes de empezar: comprobado el 22 jul 2026

Se probó el portal en local contra el Supabase **real** (no simulado), con la
Edge Function `evento-config` ya desplegada:

- `/?e=demo` → carga la config real: nombre del evento y **"En Suite Salones
  (demo)"**, el salón leído de la base. Salen los 5 módulos.
- `/muro?e=demo` → lee del servidor de verdad (aparecen los mensajes reales).
- `/?e=codigo-que-no-existe` → "No encontramos este evento". No se rompe.
- `pnpm --filter portal build` → verde (8 páginas).

O sea: **lo único que falta es crear el proyecto en Vercel.** Ninguna línea de
código pendiente.

---

## Los pasos, en el panel de Vercel

1. **Add New… → Project** y elegir el repositorio `proyectos-salones`.

2. **Project Name:** `portal-salones`
   (queda como `portal-salones.vercel.app`; se puede cambiar después sin romper
   nada, solo hay que actualizar el paso 6).

3. **Root Directory:** `apps/portal` ← *el paso que más se olvida.*
   Al elegirlo, activar la casilla
   **"Include source files outside of the Root Directory in the Build Step"**,
   igual que las otras 13 apps: el portal usa paquetes compartidos
   (`@salones/ui`, `@salones/core`, `@salones/sync`) que viven fuera de su carpeta.

4. **Framework Preset:** Next.js (lo detecta solo). El resto de comandos, por
   defecto: `vercel.json` ya trae el portero que decide si toca construir.

5. **Environment Variables** — las dos, en *Production* y *Preview*
   (son públicas por diseño, viajan en el navegador; no marcar "Sensitive"):

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://cpbfisylcquuahrmyaca.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la llave *publishable* del proyecto (la misma que ya usan catálogo y las apps) |

   ⚠️ Si faltan, el portal **no falla**: se muestra en modo demostración con los
   5 módulos y sin datos del evento. Es fácil no darse cuenta, así que conviene
   comprobar el paso 7.

6. **Deploy.** Cuesta 1 construcción de la cuota diaria.

7. **Después de crear el proyecto**, para que el panel del anfitrión enlace al
   portal y no a las apps viejas: en el proyecto **suite-salones** (el catálogo),
   añadir la variable

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_PORTAL_URL` | `https://portal-salones.vercel.app` |

   y volver a desplegar ese proyecto (otra construcción). A partir de ahí, los
   enlaces y QR de confirmaciones, muro, DJ y álbum apuntan al portal.

---

## Cómo saber que quedó bien

Abrir `https://portal-salones.vercel.app/?e=demo` y comprobar:

- Se lee **"En Suite Salones (demo)"** bajo el título. Si en vez de eso aparece
  un aviso de *modo demostración*, faltan las variables del paso 5.
- Entrar a **Muro de mensajes**: deben salir los mensajes reales del evento demo.
- Probar un código inventado (`?e=xxx`) → "No encontramos este evento".

## Coste en cuota

2 construcciones en total (el portal + volver a desplegar el catálogo). El
portero se encarga de que los despliegues siguientes solo reconstruyan el portal
cuando cambie algo que le afecte.
