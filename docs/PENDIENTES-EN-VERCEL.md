# Lo que falta tocar en Vercel (3 cosas, ~10 minutos)

Todo el código está en `main` y desplegado. Lo que queda son **ajustes en el
panel de Vercel**, que hace Fernando: son formularios de configuración de su
cuenta y automatizarlos salió mal una vez (ver el final de este documento).

Los valores están listos para copiar y pegar.

> Las dos variables se repiten en varios sitios. Son **públicas por diseño**
> (viajan en el navegador de cada invitado), así que **no marcar "Sensitive"**:
>
> | Nombre | Valor |
> |---|---|
> | `NEXT_PUBLIC_SUPABASE_URL` | `https://cpbfisylcquuahrmyaca.supabase.co` |
> | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_G0gt2CGUOrmVEjK8bMX0mA_Qqrzsuwj` |

---

## 1. 🔴 El brindis se quedó sin conexión (lo más urgente)

**Qué pasa ahora mismo:** el brindis en vivo **no puede enviar videos**. Se graba
y se puede compartir por WhatsApp, pero el botón *"Enviar a los novios"* no
aparece y la galería sale vacía.

**Por qué:** hasta ayer el brindis hablaba con **otro** proyecto de Supabase, con
la dirección y la llave escritas dentro del código. Al traerlo al sistema común
(24 jul) esas llaves salieron del código —que era el objetivo— y ahora las pide
como variables. El proyecto de Vercel del brindis nunca las tuvo.

No es un error ni se pierde nada: la app se repliega sola a "modo local" y
esconde lo que no puede hacer. Pero mientras tanto, esa función está apagada.

**Cómo se arregla:**

1. Vercel → proyecto **`proyectos-salones-brindis`** → *Settings* →
   *Environment Variables*.
2. Añadir las **dos** variables de arriba, en *Production* y *Preview*.
3. *Deployments* → el último → **Redeploy**.

**Cómo saber que quedó bien:** abrir el brindis, grabar cualquier cosa y
comprobar que aparece **"Enviar a los novios"**.

---

## 2. Publicar el portal del invitado (nunca se ha desplegado)

Es la pantalla que abre el invitado con el enlace del evento, con los 5 módulos
dentro. **Es la única de las 14 apps sin proyecto en Vercel.** Mientras no esté,
los enlaces del panel caen en las apps sueltas de siempre (hay un respaldo puesto
a propósito, así que nada se rompe).

Los pasos detallados están en [`DESPLEGAR-PORTAL.md`](DESPLEGAR-PORTAL.md). En
corto:

1. *Add New… → Project* → repositorio `proyectos-salones`.
2. **Project Name:** `portal-salones`
3. **Root Directory:** `apps/portal` ← *el paso que más se olvida.* Al elegirlo,
   marcar **"Include source files outside of the Root Directory"**.
4. Las **dos** variables de arriba (Production + Preview).
5. *Deploy*.

**Cómo saber que quedó bien:** abrir `portal-salones.vercel.app/?e=demo` y ver
**"En Suite Salones (demo)"** bajo el título. Si en vez de eso sale un aviso de
*modo demostración*, faltan las variables.

---

## 3. Enganchar el panel al portal

Solo tiene sentido **después** del paso 2.

1. Vercel → proyecto **`suite-salones`** (el catálogo) → *Environment Variables*.

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_PORTAL_URL` | `https://portal-salones.vercel.app` |

2. *Redeploy*.

A partir de ahí, los enlaces y códigos QR de confirmaciones, muro, DJ y álbum
apuntan al portal en vez de a las apps sueltas.

---

## Coste en cuota

3 construcciones en total. El plan gratis da 100 al día.

## Por qué esto no lo hago yo

El 24 jul 2026 se intentó automatizar el formulario de *New Project*. Al escribir
la primera variable, las pulsaciones no entraron en el campo y se fueron a la
página **como atajos de teclado**: Vercel abrió sola la pantalla de configuración
del **doble factor (2FA)** de la cuenta. Se salió con `Escape` sin tocar nada y no
se cambió ningún ajuste, pero la lección quedó clara: en el panel de Vercel
conviven ajustes inofensivos con ajustes de seguridad de la cuenta a un atajo de
distancia, y no compensa el riesgo por ahorrar cinco minutos.
