# Evaluación de la visión de plataforma (SaaS) y mejoras propuestas

> **Qué es esto:** una evaluación técnica de la visión "convertir la suite en una
> plataforma SaaS multi-cliente, premium y escalable", apoyada en el estado real
> del código de hoy. Complementa a [`REVISION-TECNICA.md`](REVISION-TECNICA.md)
> (estado técnico actual) y a [`SERVICIO-GESTIONADO.md`](SERVICIO-GESTIONADO.md)
> (el backend que ya existe).
>
> **Audiencia:** el equipo de desarrollo. Recoge en qué la visión es correcta, qué
> le falta o mejoraría, y una arquitectura + hoja de ruta concretas para lograrla
> **sin reescribir** lo que ya funciona.

---

## Veredicto en una línea

**La visión es estratégicamente excelente y correcta.** Diagnostica bien el
problema central (hoy son 12–13 apps sueltas, no una plataforma) y propone la
arquitectura estándar de un SaaS multi-tenant serio (Core / Módulos / Feature
Flags / Branding / Dashboard + portal único + venta por funcionalidades). No hay
que cambiarle el rumbo. Lo que se le agrega aquí es **rigor de secuencia, un par de
piezas que faltan, y realismo de costo/tiempo**.

---

## La realidad de hoy vs. la visión (punto de partida honesto)

Para no subestimar el trabajo, esto es lo que **existe** y lo que **falta** hoy
(verificado en el código):

| Pieza de la visión | Estado real hoy |
|---|---|
| Módulos (las apps) | ✅ 13 apps funcionando (buena base) |
| Sync / storage colectivo | ✅ `@salones/sync`: funciona, con aislamiento por evento |
| Vocabulario de dominio | 🟡 `@salones/core` existe pero está **sin usar** (decorativo) |
| Design system | 🟡 `@salones/ui` bueno, pero 2 apps (invitaciones, sitio) no lo usan |
| **Autenticación / cuentas** | ❌ **No existe** (ni login, ni sesiones) |
| **Multi-tenant real (salón como dueño)** | ❌ No existe; el "salón" no es una entidad, el operador está *hardcodeado* |
| **Dashboard / admin** | ❌ No existe (el catálogo es una tienda; `/evento` es un generador de enlaces sin login) |
| **Cobros / suscripciones** | ❌ No existe (los precios son informativos → cotización por WhatsApp) |
| **Feature flags / entitlements** | ❌ No existe (el único "switch" es una variable de entorno) |
| **Portal único del invitado** | ❌ No existe; son 13 dominios separados, sin navegación unificada |
| **Branding por cliente sin código** | ❌ Hoy es *build-time*, editando código, y solo afecta a 2 apps |
| Realtime | 🟡 Es **sondeo cada 3 s**, no websockets |
| brindis | 🟡 Va por su cuenta (otro proyecto Supabase + Shotstack, sin aislamiento) |

**Lectura:** la capa de "Módulos" está ~80% hecha; **falta toda la columna
vertebral** (identidad, tenencia, entitlements, portal, branding runtime, admin,
cobros). Es normal y esperable — pero es la parte más grande y difícil, y la visión
la trata como un bullet más. Ese es el primer y principal ajuste.

---

## Lo que se mejoraría / agregaría / re-secuenciaría

Ordenado por importancia.

**1. La columna vertebral (tenencia + auth + cobros) debe ir PRIMERO — no es un
bullet más, es el esqueleto.** El dashboard, el portal, el branding por cliente, los
planes y los feature flags no existen sin un modelo real de *Tenant (salón) →
Usuarios/Roles → Eventos → Invitados* y autenticación. Construir esto como Fase 0/1,
antes de cualquier UI premium.

**2. Reemplazar el "candado" actual por identidad de verdad (riesgo #1 de un SaaS).**
Hoy la seguridad es un **código en la URL** (`?e=...`) que el cliente manda como un
encabezado que él mismo controla. Sirve para demo/evento de confianza, **no para
vender contratos**: no distingue anfitrión de invitado, y no es identidad. Mantener
el enlace-código como *experiencia* del invitado, pero que el servidor entregue un
**token firmado de corta duración** por evento, y que las políticas (RLS) se basen
en *tenant + rol* (staff) y *evento* (invitado). El aislamiento entre clientes debe
ser **correcto y probado** (tests automáticos de "un cliente no puede leer datos de
otro") **antes** de meter un cliente real.

**3. Decidir explícitamente "modular PERO unificado" = un Portal único.** La visión
pide módulos independientes *y* un portal único *y* "que no se sienta como sitios
distintos". Hoy son **13 apps en 13 dominios** — lo contrario de unificado.
Consolidar la experiencia del invitado en **una sola app "Portal del Evento"**,
donde cada módulo es un *paquete* que el portal monta según las funciones
habilitadas del evento. Es un refactor grande; hay que nombrarlo. (Se puede migrar
módulo por módulo sin apagar nada — ver hoja de ruta.)

**4. Los feature flags necesitan un motor de "entitlements", no solo booleanos.**
Vender funciones y add-ons requiere: catálogo de funciones, planes = paquetes de
funciones, overrides por cliente/evento, y **enforcement en el servidor, no solo
esconder botones en la UI** (una función apagada que igual se puede llamar = fuga de
dinero, sobre todo con IA). Un motor simple pero real (plan → funciones → override)
en `@salones/core`, aplicado en cliente **y** servidor, atado al cobro (Stripe).

**5. Branding "sin tocar código" = configuración en BD + tema en runtime +
dominios.** Hoy el branding es editar CSS y recompilar, y solo cambia 2 apps. Los
colores ya son variables CSS y una app (`sitio-salon`) **ya cambia todo el tema en
runtime** con una clase. Guardar el branding de cada salón en BD (logo, colores,
tipografía, favicon, splash, dominio) e inyectarlo en runtime; y resolver
**dominios/subdominios propios** (tiene costo y operación en Vercel — planearlo).

**6. El modelo de datos actual (una tabla `jsonb` para todo) NO aguanta el dashboard
con analytics.** El almacén simple (`items` con `dato jsonb`) fue a propósito para
arrancar rápido lo colectivo. Para KPIs, participación, moderación y exportaciones,
esos datos opacos son un problema. Modelo **híbrido**: dejar `jsonb` para contenido
libre (muro, fotos, canciones) y **promover a tablas tipadas** lo que se
reporta/cobra/modera (RSVP, invitados, mesas, moderación, analytics, suscripciones).
Migrar RSVP y mesas primero.

**7. Realtime de verdad para "actividad en tiempo real".** El dashboard y las
experiencias en vivo piden websockets; hoy es sondeo de 3 s. Supabase Realtime
detrás de la **misma interfaz** de `@salones/sync` (cambio de "proveedor", no de las
apps). Ofrecerlo como función premium (palanca de costo).

**8. La visión no menciona COSTOS — y premium a escala cuesta.** Fotos y sobre todo
**video e IA** cuestan dinero real por evento. Modelar la economía por evento
(storage, render de video, tokens de IA, ancho de banda) y **atarla a los planes**
para que los márgenes cierren. Medir cada trabajo de IA y ponerle cuota.

**9. Las funciones WOW de IA: excelentes, pero AL FINAL y como add-ons medidos.**
Resumen IA, video automático, álbum inteligente, clasificación de fotos, moderación
IA — grandes diferenciadores y muy vendibles, pero dependen de contenido
centralizado, datos estructurados y **control de costo**. Dejarlas para el final,
cada una como add-on con cuota y cobro por uso. **brindis + Shotstack ya prueba el
patrón** (video generado en la nube) — reutilizar ese aprendizaje.

**10. No reescribir + una pieza que la visión omite: privacidad y consentimiento.**
La base actual (`@salones/core`, `@salones/ui`, `@salones/sync`, las 13 apps) es más
de lo que tiene la mayoría de los proyectos: **evolucionarla, no tirarla**
(migración incremental "strangler-fig", no *big rewrite*). Falta un pilar que un
producto de fotos/IA sobre caras de invitados **necesita legalmente y vende
confianza**: consentimiento de invitados, retención/borrado de contenido al cerrar
el evento, y propiedad/entrega del material a los novios.

**(Menor)** Unificar `invitaciones` y `sitio-salon` al design system, y **absorber
brindis** del silo aparte al backend unificado.

---

## Arquitectura objetivo recomendada

Un **plano de control unificado** (un solo proyecto Supabase: Postgres + Auth +
Storage + Realtime + Edge Functions). La modularidad vive en **paquetes**, no en 13
despliegues.

- **Core** (`@salones/core`, hoy decorativo → protagonista): tipos de dominio reales
  + validación + motor de entitlements `resolveEntitlements(plan, overrides)`.
- **Identidad/Tenencia:** `Tenant(Salón) → TenantMember(user, rol) → Event → Guest`.
  Staff se autentica (Supabase Auth); el invitado NO (token de capacidad por
  enlace). Modelo "doble principal" para que las reglas de acceso tengan una sola
  lógica.
- **Módulos:** cada app actual → paquete `@salones/module-<x>` con un *manifest*
  (`claveDeFunción, rutas, navegación, colecciones, permisos-de-invitado, panel-admin`).
  Agregar un módulo en 5 años = publicar un paquete + una función + asignarla a
  planes. **Sin cirugía al portal** (contesta el test de "30 módulos sin rehacer el
  sistema").
- **Portal del Evento** (`apps/portal`, uno solo): shell compartido + branding
  runtime + navegación según funciones habilitadas; monta los módulos por manifest.
- **Branding:** `tenant_branding` en BD → inyección de variables CSS en runtime
  (reutiliza tokens de `@salones/ui`) + dominios custom.
- **Admin** (`apps/admin`): gestiona todo (eventos, clientes, módulos, analytics,
  cobros, branding, roles, moderación, exportaciones) usando los mismos manifests.
- **Datos:** híbrido `jsonb` (contenido) + tablas tipadas (negocio/analytics).
- **Cobros:** Stripe (suscripciones) → webhooks escriben los entitlements.

---

## Hoja de ruta por fases (incremental, sin apagar nada)

Regla de oro de secuencia: **columna vertebral → portal → branding → admin → resto
de módulos → pulido premium → IA.** No se puede invertir.

| Fase | Qué | Por qué en este orden |
|---|---|---|
| **0. Plano de control** | Esquema unificado (tenants, eventos, funciones/planes/entitlements); migrar `items`→`event_items` con `tenant_id`; `resolveEntitlements()` en core | Todo lo demás necesita un tenant, un evento real y una respuesta de "¿qué está habilitado?" |
| **1. Auth + tenencia + cobros** | Supabase Auth (staff), roles en el token, RLS por tenant/rol, token firmado para invitados; Stripe | Identidad + entitlements = base de aislamiento y de dinero |
| **2. Portal + primer módulo** | `apps/portal` (shell, navegación por funciones); migrar **muro** como referencia | Un módulo chico que ejercita todo (invitado, colección, realtime, branding, flag) |
| **3. Branding runtime** | Tema por tenant desde BD; logo/favicon/splash/fuentes; dominios custom | Necesita el shell del portal donde inyectar |
| **4. Dashboard admin (MVP)** | Gestión de eventos/clientes/módulos, moderación, analytics básico, export; promover RSVP a tablas tipadas | Moderación y analytics necesitan datos consultables |
| **5. Migrar módulos restantes** | Playlist, dinámicas, álbum → RSVP+mesas+mi-mesa (tipados) → invitaciones+sitio (adoptan design system) → pases+photobooth → **absorber brindis** | Patrón repetible; se retira cada app vieja al llegar a paridad |
| **6. UX premium / design system v2** | Movimiento, microinteracciones, estados (vacío/carga/error), tipografía | El "nivel Apple/Stripe" luce cuando la plataforma ya funciona |
| **7. Add-ons de IA** | Resumen IA, auto-video, álbum inteligente, moderación IA — cada uno medido y con cuota | Máximo costo/riesgo; necesita datos tipados + cobro ya listos |

Es un **programa de ~1–3 años** (no un sprint), pero cada fase entrega valor y deja
lo anterior vivo.

---

## Reutilizar / refactor / retirar

- **Reutilizar y extender:** `@salones/sync` (evolucionar el proveedor servidor, sin
  cambiar su *interfaz* — es la costura), `@salones/ui` (→ v2), `@salones/core`
  (decorativo → protagonista), el código de las 13 apps (semilla de los módulos).
- **Refactor:** 13 apps → paquetes-módulo que el Portal compone; `items` →
  `event_items`; RSVP/mesas → tipado.
- **Retirar:** brindis como silo aparte; el generador `/evento` sin login → alta de
  eventos autenticada; 12 de 13 proyectos Vercel (con redirects); el encabezado
  `x-evento` sin firmar. El `catalogo` se queda como tienda pública.

---

## Decisiones abiertas a acordar

1. **Portal único (una app) vs. multizona vs. seguir separados.** → App única;
   multizona solo como puente temporal durante la migración.
2. **Datos:** `jsonb` para todo vs. tipado. → Híbrido (tipar lo que se
   reporta/cobra/modera).
3. **Auth / flags / cobros: construir vs. comprar.** → Supabase Auth + Stripe
   (comprar); motor de entitlements propio y delgado (construir).
4. **Supabase-only vs. Postgres dedicado/microservicios.** → Supabase-only por
   ahora, con acceso a datos detrás de interfaces para migrar después.
5. **Empaquetado de módulos** con contrato *manifest* (clave, rutas, nav,
   colecciones, permisos, panel).
6. **Realtime:** sondeo (gratis) por defecto + Realtime (premium) detrás de la misma
   interfaz.
7. **Costo de IA → precio:** medir cada trabajo, cuotas por plan, cobro por uso.

---

## Riesgos principales (y cómo los mitiga el diseño)

- **Trampa del "big rewrite":** migración strangler-fig sobre las costuras
  (`@salones/sync`, manifests); nada se apaga; el portal puede "puentear" a las apps
  aún no migradas.
- **Aislamiento multi-tenant (severidad máxima):** tokens firmados en vez de
  encabezado; RLS deny-by-default por tenant/evento; **suite de tests de aislamiento
  en CI antes de meter un cliente real.**
- **Costo / economía a escala:** realtime por niveles, IA medida con cuotas,
  políticas de expiración del storage, una sola app en vez de 13.
- **Explosión de alcance ("30 módulos, 100 funciones"):** el contrato de manifest +
  el motor de entitlements = el gobernador; módulos uniformes, funciones = filas en
  BD, planes = configuración.

---

## Resumen ejecutivo (3 frases)

1. La visión es la correcta; el ajuste principal es de **secuencia**: primero la
   columna vertebral (auth + tenencia + cobros + entitlements), luego el portal
   único, el branding runtime y el dashboard, y **al final** la UX premium y la IA.
2. Antes de vender contratos hay que **cambiar el candado por enlace por identidad
   firmada** y **probar el aislamiento entre clientes con tests**, y **evolucionar el
   modelo de datos** a tablas tipadas para el dashboard/analytics.
3. Todo esto se logra **evolucionando** la base existente (no reescribiendo), y
   **modelando los costos** (storage/video/IA) contra los planes para que "premium"
   sea también rentable.
