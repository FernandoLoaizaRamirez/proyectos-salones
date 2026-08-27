# Base de datos (Supabase)

Aquí vive el esquema del backend bajo **control de versiones**. Hasta ahora, la
estructura de la base de datos solo existía dentro de la documentación y en el
proyecto Supabase en vivo; estos archivos la hacen reproducible y auditable.

Proyecto principal: **`cpbfisylcquuahrmyaca`** (`https://cpbfisylcquuahrmyaca.supabase.co`).

## Migraciones (`migrations/`)

Se aplican **en orden**. Cada una es idempotente/aditiva (segura de correr):

| Archivo | Qué hace | ¿Toca producción? |
|---|---|---|
| `0001_estado_actual.sql` | Reproduce lo que YA existe: tabla `items`, candado `x-evento` (Fase 5), bucket `media`. | No cambia nada nuevo. |
| `0002_plano_de_control.sql` | Crea las tablas nuevas de la plataforma (tenants, eventos, planes, funciones, entitlements…) + su semilla. | Solo agrega tablas nuevas. |
| `0003_items_multitenant.sql` | Agrega a `items` las columnas `tenant_id`, `module`, `created_by` (aditivo). | Columnas nuevas con default; no rompe las apps. |
| `0005_pagos.sql` | Crea la tabla `subscriptions` (cobros Stripe), con RLS cerrada. | Solo agrega una tabla nueva; cobros apagados. |
| `0007_branding.sql` | Crea la tabla `tenant_branding` (marca por salón) con **lectura pública** + semilla del salón demo. | Solo agrega una tabla nueva; branding = dato público. |
| `0006_pase_firmado.sql` | El **pase firmado** por evento (`emitir_pase`): la llave deja de ser un encabezado que cualquiera escribe. | Aditiva; convive con el candado viejo. |
| `0008_rls_tenant_rol.sql` | Reglas por **salón y rol** en el plano de control (quién ve y toca qué). | Cierra tablas que estaban solo con RLS activada. |
| `0009_llave_anfitrion.sql` | La **llave de anfitrión** (`events.clave_anfitrion`) y su pase: la segunda llave, la de quien organiza. | Aditiva. Su corte va en la `0014`. |
| `0010_candado_fotos.sql` | Permisos para que `media-subir` firme las subidas. | Aditiva. Su corte va en la `0014`. |
| `0011_invitados_cupos.sql` | Cupos por invitado en `guests`. | Columna nueva con default. |
| `0012_diagnostico.sql` | Tabla `app_errores` + la función que la escribe: los fallos dejan rastro. | Solo agrega una tabla nueva, cerrada. |
| `0013_media_privado.sql` | El almacén pasa a **privado**: las fotos se ven con dirección firmada que caduca. | Su corte va en la `0014`. |
| `0014_cortes_aplicados.sql` | **Los tres cortes de seguridad**, ya sin comentar. Lo que convierte la base insegura en la segura. | **Ninguno en el proyecto en vivo** (ya se corrieron a mano el 24 jul 2026); es el cierre en uno nuevo. |
| `0015_tope_subidas.sql` | Tope de subidas por pase y por evento, para que nadie llene el almacén compartido. | Aditiva. ✅ **Corrida el 14 ago 2026** (comprobado en la base: están la tabla `media_permisos`, sus índices y la función `permitir_subida`). |
| `0016_candado_sobrescritura.sql` | **El candado de SOBRESCRIBIR**: un invitado ya no puede vaciar, esconder ni renombrar lo que subió otro. | ✅ **Corrida el 14 ago 2026** y verificada atacando producción con un pase de invitado normal: vaciar una fila ajena, esconderla cambiándole la colección y el borrado masivo por colección dan **401 y 0 filas**; el anfitrión sigue guardando (200). Están el disparador `trg_items_candado_sobrescritura`, su función y las 6 colecciones de la lista blanca. ⚠️ Contesta **401, no 403** como dice el archivo: lo traduce PostgREST. `esSinPermiso` de `@salones/sync` ya cuenta los dos. |
| `0017_paquete_video.sql` | El **paquete de video** como función vendible + `evento_tiene_funcion`, la única respuesta para el navegador y para el servidor. | ✅ Corrida el 14 ago 2026. Apaga el video en los eventos que no lo tengan contratado. |
| `0018_cupo_almacenamiento.sql` | **Cupo de espacio por evento**, medido de los bytes reales de `storage.objects`. Necesita la `0017`. | ✅ Corrida el 14 ago 2026. ⚠️ Sus cupos (3 GB / 15 GB) los reemplaza la `0019`: eran más grandes que todo el proyecto. |
| `0019_cupos_plan_gratis.sql` | **Techo global del almacén** (900 MB) + cupos a escala del plan gratis + aviso al 80% en el diagnóstico. Necesita la `0018`. | ✅ Corrida el 14 ago 2026. **Aquí se cambian los cuatro números el día que se suba a un plan de pago.** |

| `0023_tope_subidas_vuelve.sql` | **El tope de subidas vuelve a topar.** La `0022_vitrina_por_visitante` reescribió `permitir_subida` y de paso le quitó el `insert into media_permisos` (sin apunte, los contadores se quedan en cero y concede SIEMPRE) y le dio `grant execute` a `anon`, que la `0015` prohibía expresamente. Devuelve las dos cosas sin tocar los topes de las vitrinas. | ✅ Corrida el 22 ago 2026 (CI verde con la suite de seguridad). |
| `0025_tema_salon_evento.sql` | **El tema por salón y por EVENTO** (rediseño, Fase 1): `tenant_branding` gana `sitio_url`, `fuentes` (clave de allowlist), `fondo`/`tinta`, `esquema` y políticas de ESCRITURA para owner/admin; nace `event_branding` (color, portada, monograma, frase del evento) **sin lectura pública** — solo la lee `evento-config` con service-role y el staff del salón dueño. | Aditiva e idempotente. Correrla ANTES de redesplegar `evento-config` (la función es segura en ambos órdenes, pero ese es el orden del plan). |
| `0026_semilla_demo_hacienda.sql` | **La demo hereda la identidad del sitio**: el salón demo pasa del "Vino & Oro" genérico a los valores EXACTOS de Hacienda Santa Renata (vino/oro/crema, Cormorant+Jost), y el evento `demo` gana monograma y frase. Atada por prueba a la constante `TEMA_DEMO` de @salones/ui y a la paleta del sitio. | ⚠️ **NO correrla junto con la 0025**: cambia los colores que `evento-config` devuelve AL INSTANTE, y debe llegar en el MISMO despliegue que el portal rediseñado (Fase 2 del plan), o el portal viejo (oscuro) enseñaría el tema nuevo a medias. Es la excepción documentada a la regla "todas seguidas en orden". |
| `0027_caracteristicas_finas.sql` | **Los detalles vendibles DENTRO de cada experiencia** (`album.descargas`, `muro.fotos`, `playlist.votos`, `dinamicas.ranking`) + `evento_tiene_caracteristica`, que envuelve a `evento_tiene_funcion` y añade la HERENCIA: sin fila propia manda el módulo. Permite vender "el álbum sí, pero sin descargas" sin duplicar código. | ✅ Corrida el 24 ago 2026 y verificada en la base: con el override apagado, `album.descargas`=false mientras `album` sigue en true; un evento inventado da false. Aditiva; NO mete las claves en ningún plan a propósito (la herencia ya las da). |
| `0028_experiencia_completa.sql` | **Las cinco funciones que faltaban para la muestra completa** (Etapa 1): `pase`, `cronograma`, `lugar`, `vestimenta` y `faq` nacen en `features` y se encienden para el evento `demo` por `event_overrides` (mismo patrón que la `0020`). El portal pasa de 9 a 14 experiencias. | ✅ **Corrida el 26 ago 2026 y verificada en la base** (las 5 claves en `features` y las 5 con override encendido para el evento demo). Aditiva e idempotente. NO mete las claves en ningún plan a propósito (decisión comercial pendiente); cada evento real las enciende una por una. |

> ⚠️ **Faltan en esta tabla la `0020`, la `0021` y las DOS `0022`** — sí, hay dos
> archivos con el número 0022 (`album_privado` y `vitrina_por_visitante`), lo
> que es una trampa para quien las corra a mano: por el número parecen una sola.

> ⚠️ **CÓMO SABER DE VERDAD QUÉ ESTÁ CORRIDO.** No te fíes de esta tabla:
> pregúntaselo a la base. (De las pruebas ya sí te puedes fiar: hasta el 14 ago
> 2026, `sobrescritura.test.ts` se saltaba sus casos **en silencio** y salía
> verde con el candado ausente; ahora con `EXIGIR_SEGURIDAD=1` se pone roja, y
> sin ese interruptor sale como "saltada" en vez de como pasada.)
>
> ```bash
> npx supabase db query --linked --project-ref cpbfisylcquuahrmyaca "select 'media_permisos='||(select count(*) from pg_tables where tablename='media_permisos')||' trigger_0016='||(select count(*) from pg_trigger where tgname='trg_items_candado_sobrescritura') as estado;"
> ```
>
> Un `0` significa que esa migración **no está**, por mucho que digan las notas.
>
> Y para que esas pruebas **ataquen de verdad** en vez de saltarse, hay que darles
> las dos variables públicas, que ya están en el disco:
>
> ```bash
> set -a && . ./apps/muro/.env.local && set +a && EXIGIR_SEGURIDAD=1 npx vitest run tests/aislamiento/
> ```
>
> Con la `0016` puesta, `sobrescritura.test.ts` pasa de saltada a 8 casos verdes de
> verdad. Esa es la señal, no el color de la suite sin las variables.

> ⚠️ **La `0014` no es opcional.** Sin ella, un proyecto reconstruido desde
> este repositorio nace con los tres agujeros abiertos: cualquier invitado
> puede borrar la boda entera, cualquiera puede subir al álbum de cualquier
> evento, y todas las fotos se ven por su dirección para siempre. Córrela
> **después** de desplegar las Edge Functions `media-subir` y `media-ver`:
> sin ellas, tras el corte no se pueden ni subir ni ver fotos.

> **Ojo con la lectura pública de `0007`:** es la primera tabla del plano de
> control que se puede leer con la llave pública (anon). Es a propósito: el
> branding (nombre, logo, colores) no es secreto. La **escritura** sigue cerrada
> (solo el rol de servicio); las demás tablas del plano de control siguen cerradas.

## Cómo aplicarlas

**Opción simple (la que usamos): SQL Editor del panel de Supabase.**
1. Entra a [supabase.com](https://supabase.com) → proyecto `suite-salones`.
2. Menú **SQL Editor** → **New query**.
3. Pega el contenido de cada archivo **en orden** (0001 → 0002 → 0003 → 0005 →
   0006 → 0007 → 0008 → 0009 → 0010 → 0011 → 0012 → 0013 → 0014 → 0015 → 0016 →
   0017 → 0018 → 0019 → 0020) y dale **Run**.
   ⚠️ Antes de la `0014`, despliega las Edge Functions.
   ⚠️ La `0018` necesita la `0017` aplicada (le pregunta por el paquete de video).
4. En el proyecto que ya está en vivo, la `0001` ya está aplicada (no hace daño
   volver a correrla: es idempotente). Lo nuevo de esta etapa es la `0002` y la `0003`.

> Regla de oro: estas migraciones son **aditivas**. Aun así, aplícalas cuando las
> 5 apps conectadas (muro, playlist, rsvp, dinámicas, álbum) estén desplegadas, y
> verifica después que siguen funcionando (ver `docs/FASE-0-1-PLATAFORMA.md`).

---

## ⛔ NUNCA corras `supabase db push` en este proyecto

**Reaplicaría las migraciones desde la `0001` sobre la base con las bodas dentro.**

Por qué, y por qué no salta ningún aviso: la CLI lleva su propia contabilidad de
qué migraciones se aplicaron, en la tabla `supabase_migrations.schema_migrations`.
Aquí **esa tabla está vacía**, porque todas se corrieron a mano por el SQL Editor,
que no apunta nada. Así que la CLI cree que no se ha aplicado ninguna:

```bash
npx supabase migration list --project-ref cpbfisylcquuahrmyaca
```

Verás las 18 con la columna `remote` en blanco, aunque estén todas vivas y
funcionando. `db push` se fía de esa tabla, no de la realidad.

Esto no es una trampa rebuscada: `db push` es lo que recomiendan la documentación
de Supabase y cualquier tutorial. **Este README lo recomendaba también**, hasta el
14 ago 2026. Que quede escrito para que nadie —persona o asistente— lo repita.

### Lo que sí hay que hacer

Correr **un solo archivo**, sin tocar la contabilidad:

```bash
npx supabase db query --linked --project-ref cpbfisylcquuahrmyaca -f supabase/migrations/0018_cupo_almacenamiento.sql
```

Tres cosas que conviene saber de ese comando:

- Corre la migración **dentro de una transacción**. Si algo falla a mitad, se
  deshace entera y no deja nada colgando. Comprobado el 14 ago: la `0018` falló
  al intentar crear un índice y no dejó ni rastro.
- `--project-ref` **exige** `--linked`. Sin él da `LegacyProjectNotLinkedError`.
- La CLI 2.x ya no lee `supabase/.temp/linked-project.json`, por eso hay que
  pasarle el `--project-ref` a mano.

Y sigue valiendo el SQL Editor de arriba, que es como se hizo siempre.

### Antes de acercar un SQL a producción

Pásalo por el banco de pruebas (`supabase/pruebas/`). No es burocracia: en la
`0018` cazó que un evento inexistente se llevaba 3 GB de cupo en vez de 0 —o sea,
que fallaba abierto— antes de que el archivo tocara la base real.

### Lo que no se puede hacer, aunque parezca lógico

`storage.objects` es de Supabase, no del proyecto: **no se le pueden crear
índices ni disparadores**. Responde `42501: must be owner of table objects`. Si
alguna vez hace falta acelerar una cuenta sobre el almacén, la salida es guardar
el total en una tabla propia, no pelearse con los permisos de una ajena.
