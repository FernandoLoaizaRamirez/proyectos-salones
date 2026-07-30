# Playbook: cómo construir un ecosistema de apps (desde el principio, bien)

> Este documento destila lo que se construyó en la Suite para Salones y lo
> convierte en un **molde reutilizable** para arrancar el próximo ecosistema sin
> repetir los errores caros. No es la documentación de este proyecto (esa vive en
> `ARQUITECTURA.md`, `SERVICIO-GESTIONADO.md`, etc.); es la **base para el
> siguiente**.
>
> Está escrito en dos capas: los **conceptos** (para decidir la visión) y las
> **decisiones técnicas** (para ejecutarlas bien). Un no-programador puede leer los
> conceptos; quien construya sigue lo concreto.

---

## Parte 1 · Qué es un "ecosistema" y qué se construyó

Un **ecosistema** aquí significa: **muchas apps pequeñas que comparten una misma
base**, se venden juntas a un mismo tipo de cliente (un *vertical*: salones,
gimnasios, clínicas…) y se sienten como un solo producto.

En el caso de los Salones se construyó, por capas:

| Capa | Qué es | Por qué importa |
|---|---|---|
| **Las apps** (12–14) | Muro, álbum, playlist, RSVP, brindis, mesas, dinámicas… | Es lo que el cliente ve y compra. |
| **La costura común** | Un paquete (`@salones/sync`) por el que TODAS las apps hablan con el servidor | Cambiar el motor por dentro sin tocar las apps. La pieza clave. |
| **El backend gestionado** | Junta el contenido de muchos teléfonos en un solo lugar, por evento | Convierte apps sueltas en una experiencia colectiva. |
| **Multi-cliente (tenancy)** | Cada salón es dueño de sus datos, aislado del resto | Sin esto no puedes vender a más de un cliente. |
| **Planes y permisos** | Un motor que decide qué funciones tiene cada cliente según su plan | Es el "motor comercial": vende funciones, no solo apps. |
| **El catálogo-tienda** | La página donde el cliente ve todo, arma su combo y cotiza | La herramienta de venta, parametrizable por marca. |
| **Seguridad** | Candados por evento, borrado del dueño, archivos privados | Sin esto no puedes manejar datos de terceros en serio. |
| **Capa legal** | Aviso de privacidad, términos, consentimiento | Obligatorio si manejas datos de personas. |

La lección de conjunto: **un ecosistema no son 14 apps; son 8 capas.** Las apps
son la punta del iceberg.

---

## Parte 2 · La arquitectura de referencia (el esqueleto reutilizable)

Estas son las piezas que, si las pones bien, sirven para CUALQUIER vertical.

### 2.1 Monorepo con paquetes compartidos
Todo en un solo repositorio, con **paquetes** que las apps comparten:
`core` (lógica de negocio pura), `ui` (componentes), `sync` (la costura),
`legal`, `payments`, `config`. Herramientas: **Turborepo + pnpm workspaces**.

**Por qué:** un botón, un texto legal o una regla de negocio se escribe **una vez**
y sale idéntico en las 14 apps. Sin esto, cada app diverge y el mantenimiento se
vuelve imposible.

### 2.2 La costura estable (lo más importante de todo)
Define **una interfaz** por la que las apps hablan con el mundo exterior
(`ProveedorSync`: guardar, listar, suscribir, subir archivo…). Las apps solo
conocen esa interfaz. **El motor real vive detrás de ella** y puede cambiar sin
que las apps se enteren.

**Por qué:** en Salones, se empezó con un candado simple (`x-evento`) y se migró a
uno firmado y a fotos privadas **sin reescribir ni una app**, porque el cambio
vivía dentro de la costura. Esta es la técnica *strangler-fig*: envuelves lo viejo
y lo sustituyes por dentro, poco a poco, sin apagar nada.

> **Regla de oro:** la interfaz de la costura NO se cambia a la ligera. Todo lo
> demás puede evolucionar; ella es el contrato.

### 2.3 Multi-cliente desde la base de datos
Cada cliente (*tenant*) es dueño de sus filas. Se usa **RLS (Row-Level Security)**
de la base de datos: reglas que, a nivel del motor, impiden que un cliente vea los
datos de otro — aunque la app tuviera un bug. La identidad del cliente viaja en el
*token* de sesión, no en el código.

**Por qué:** la seguridad de verdad está en la base, no en la app. Una app se puede
hackear; una política de RLS bien puesta, no.

### 2.4 Planes y permisos como motor puro
Una función **pura y probada** (`resolveEntitlements`) que recibe el plan del
cliente y devuelve qué funciones tiene encendidas. Corre igual en el cliente y en
el servidor. Los cobros (Stripe) se enchufan detrás de una bandera, apagados hasta
que se necesiten.

**Por qué:** vender es "encender funciones por plan". Si ese motor es puro y está
probado, cobrar es solo conectar la plomería; el "qué tiene cada quién" ya es
sólido.

### 2.5 Lógica sensible en funciones de servidor
Lo que necesita un secreto (firmar un permiso, verificar un pago, firmar la
dirección de una foto privada) vive en **Edge Functions**, no en la app. La app
nunca ve la llave maestra.

### 2.6 White-label desde el diseño
Nada del cliente está *hardcodeado*. La marca (nombre, colores, logo), los textos
legales y el catálogo se **parametrizan por cliente** y se leen de la base o de la
configuración. El mismo código sirve a todos.

---

## Parte 3 · Las prácticas que lo hicieron profesional

No es solo la arquitectura; es cómo se trabaja.

- **El esquema y la seguridad, bajo control de versiones.** Las tablas, las reglas
  de RLS y las funciones viven como **migraciones numeradas** en el repo, no solo
  "en el servidor". Así el estado de la base es reproducible y auditable.
- **Pruebas contra el backend real.** Además de las pruebas unitarias, hay pruebas
  de **aislamiento** que atacan el Supabase real como si fueran un intruso, y
  comprueban que no pueden colarse. La seguridad se *verifica*, no se supone.
- **CI que compila Y prueba.** Cada cambio compila las 14 apps, revisa tipos y
  corre las pruebas. Un cambio que rompe algo no llega a producción en verde.
- **Un "centinela" que vigila la seguridad.** Una prueba especial que, si alguna
  pieza de seguridad se cae (una migración revertida, una función borrada), pone el
  CI **rojo**. La seguridad no se puede apagar por accidente.
- **Migraciones sin apagar nada (convivencia + corte).** Para cambiar un candado en
  producción: primero el sistema acepta el viejo Y el nuevo a la vez (convivencia);
  se despliegan las apps con lo nuevo; se verifica; y solo entonces se apaga lo
  viejo (el *corte*), en un rato tranquilo y con marcha atrás lista. Cero downtime.
- **Degradación elegante.** Todo funciona aunque falte una pieza: sin las variables
  del servidor, las apps corren en modo local; sin una función desplegada, se usa
  el camino anterior. Nunca una pantalla rota.
- **Ahorro de recursos automatizado.** Un "portero" decide qué apps reconstruir en
  cada cambio, para no gastar la cuota del plan gratis construyendo lo que no cambió.

---

## Parte 4 · Lo que haría DISTINTO desde el principio (las lecciones caras)

Esto es lo más valioso del documento. Son cosas que en Salones costaron tiempo o
se hicieron tarde, y que en el próximo ecosistema deben ir **desde el día uno**.

1. **La seguridad y el multi-cliente, desde el inicio — no después.**
   En Salones se construyeron las apps primero y la seguridad se añadió al final,
   lo que obligó a "cortes" delicados en producción. **En el próximo:** diseña el
   aislamiento por cliente y los candados ANTES de la primera app. Es mucho más
   barato construir sobre cimientos seguros que reforzarlos con la casa habitada.

2. **El esquema de la base, versionado desde la primera tabla.**
   Se descubrió a mitad del proyecto que la base y sus reglas **no estaban en el
   repo** (solo "en vivo"). **En el próximo:** la primera migración es el commit
   número uno. Nunca una tabla que solo exista en el servidor.

3. **Una sola costura común — nunca silos.**
   El módulo del brindis empezó hablando con **otro** backend, con las llaves
   escritas en el código: un "silo" que costó trabajo traer al redil. **En el
   próximo:** ninguna app habla con el servidor por su cuenta. Todas por la costura,
   desde la primera línea.

4. **La capa legal, desde que se toca el primer dato personal.**
   Se dejó para el final y resultó ser un tapón para vender. **En el próximo:** si
   el producto maneja datos de personas, el aviso de privacidad y el reparto
   *responsable/encargado* se plantean al inicio, no cuando ya quieres cobrar.

5. **El white-label, desde el diseño — no un cliente hardcodeado.**
   Empezar con "un salón de ejemplo" incrustado obliga a des-incrustarlo después.
   **En el próximo:** desde el primer día, el cliente es un *dato*, no una constante.

6. **Los planes/permisos, aunque los cobros estén apagados.**
   Tener el motor de "qué función por qué plan" desde temprano (aunque no cobres
   aún) hace que activar cobros luego sea trivial. Se hizo bien en Salones; repetir.

7. **Elegir el modelo de negocio antes de construir de más.**
   En Salones se definieron 3 modelos (gestionado / renta / compra) y 2 caminos
   (vender como servicio vs. producto que se vende solo). Saber cuál persigues
   evita construir plomería (checkout, alta automática) que no necesitas todavía.

---

## Parte 5 · El blueprint para arrancar el próximo ecosistema

El orden importa. Construir en este orden evita las lecciones de la Parte 4.

**Fase 0 — Los cimientos (antes de la primera app)**
1. Elegir el vertical y **el modelo de negocio** (servicio / renta / compra; una
   sola marca o multi-cliente).
2. Montar el **monorepo** (Turborepo + pnpm) con los paquetes vacíos: `core`,
   `ui`, `sync`, `config`.
3. Definir la **costura** (`ProveedorSync`): la interfaz por la que todo hablará.
4. Montar la base con **multi-cliente y RLS desde la primera migración**
   (versionada en el repo), y la **identidad en el token**.
5. Escribir el **motor de planes/permisos** (puro, probado), con los cobros
   detrás de una bandera apagada.
6. Poner el **CI** (compila + prueba) y las **pruebas de aislamiento** contra el
   backend real. El "centinela" de seguridad si el vertical maneja datos de
   terceros.

**Fase 1 — La primera app (la prueba del molde)**
7. Construir UNA app completa por la costura, con su marca parametrizada
   (white-label) y su plan/permiso. Si esta app queda limpia, el molde sirve.

**Fase 2 — El resto de las apps**
8. Replicar el patrón. Cada app nueva es "rellenar la plantilla", no reinventar.

**Fase 3 — El backend gestionado (si aplica)**
9. Lo colectivo (juntar contenido de muchos dispositivos por evento/sesión).

**Fase 4 — La tienda y lo legal**
10. El catálogo-tienda white-label. La capa legal si hay datos personales.

**Fase 5 — Cobros y crecimiento**
11. Encender los cobros (ya está la plomería). Dominios por cliente. Escalar.

---

## Resumen en una frase

**Un ecosistema profesional no se construye app por app; se construye
capa por capa — y la seguridad, el multi-cliente y la costura común van en los
cimientos, no en el acabado.**

> Documentos de apoyo de este proyecto (como referencia real de cada pieza):
> `ARQUITECTURA.md`, `SERVICIO-GESTIONADO.md`, `EVALUACION-VISION-PLATAFORMA.md`,
> `GUION-DEL-CORTE.md`, `LEGAL.md`, `PARA-EL-ABOGADO.md`.
