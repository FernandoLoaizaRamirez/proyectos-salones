# `scripts/` — los dos guardianes del despliegue

Dos archivos, los dos se ejecutan **fuera** de las apps y por eso viven aquí.

| Archivo | Qué hace | Quién lo llama |
| --- | --- | --- |
| `vercel-construir-si-cambio.mjs` | **El portero.** Decide si una app se construye o se salta, mirando si el commit tocó algo suyo. | Vercel, en *Ignored Build Step*, una vez por app. |
| `comprobar-apps-al-dia.mjs` | Avisa si alguna app publicada se quedó atrás respecto a `main`. | A mano. |

## ⚠️ Si tu cambio no se publicó, empieza por aquí

El síntoma es el mismo siempre: **empujaste, el CI salió verde, y producción sigue
igual — sin ningún error en ninguna parte.**

Casi nunca es Vercel. Es el portero, y tiene un fallo conocido (documentado a
detalle dentro de `vercel-construir-si-cambio.mjs`, 21 ago 2026):

> Compara contra `VERCEL_GIT_PREVIOUS_SHA`, que es **el último INTENTO**, no el
> último despliegue bueno **de esa app**. Cuando llegan dos commits con poco
> margen, Vercel descarta los intermedios y salta al último; el portero compara
> entonces contra un rango que no incluye tu cambio, y cancela.

Cómo se reconoce: en el historial de la app **falta un commit**. Se ve
`READY <viejo>` y luego `CANCELED <nuevo>`, sin rastro del de en medio.

⚠️ Y para verlo hay que **encender el filtro "Canceled"** en la lista de
Deployments de Vercel: viene APAGADO por defecto y esconde justo estos casos.
Si ni siquiera aparece cancelado, es que Vercel se saltó ese commit entero.

## Cómo forzar que se reconstruyan las 14

La regla del portero dice que **cualquier cambio dentro de `scripts/` obliga a
construir todas las apps** (línea 46: "si cambia este mismo portero, no nos
fiamos"). Así que la salida es empujar un commit que toque esta carpeta —
incluido este mismo archivo.

Cuesta ~14 construcciones de las 100 diarias del plan gratis. No es gratis, pero
es la forma segura: deja a las 14 apps con el código de `main`.

## Cómo se arreglaría de raíz

Dejar de fiarse de `VERCEL_GIT_PREVIOUS_SHA` y preguntarle a la API de Vercel
cuál fue el último despliegue **READY de esa app**, que es la única referencia
que no miente. Necesita un token de Vercel disponible durante la construcción.

## Lo que NO funciona (probado el 22 ago 2026)

- **`npx vercel deploy --prod` desde la raíz.** No falla: se queda **colgado**
  intentando subir el monorepo entero, y sale con código 0 sin haber creado nada.
  Desde fuera parece que funcionó. Comprobado con `npx vercel ls`: ningún
  despliegue nuevo. No es la salida.
- **Esperar a que la fila llegue sola.** Vercel construye de una en una, y cada
  push nuevo **descarta los intermedios**. Con otra sesión empujando cada pocos
  minutos, las apps del final de la fila —el catálogo entre ellas— no llegan a su
  turno nunca. Si hay alguien más trabajando en el repo, hay que esperar a que
  pare antes de empujar el commit que reconstruye.

## Cuánto dura la ventana

Vercel tarda ~5 minutos en recorrer las 14 apps, y **cualquier push que llegue
en ese rato descarta lo que quede en la fila**. Si otra sesión está trabajando,
conviene avisarle y esperar a que pare antes de empujar el commit que
reconstruye; si no, se gastan 14 construcciones para nada y el cambio sigue sin
publicarse.
