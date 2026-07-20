# Lista de encendido — todo, en orden

> **Estado medido contra tu Supabase real el 20 de julio de 2026.** No son
> suposiciones: se comprobó tabla por tabla y función por función.
>
> Esta lista **sustituye** al orden repartido por los otros runbooks. Ellos
> siguen sirviendo para el detalle y para saber qué hacer si algo falla.

---

## Cómo está hoy

| | Estado |
|---|---|
| Migraciones **0001, 0002, 0003, 0006, 0007** | ✅ aplicadas |
| Migraciones **0005, 0008, 0009, 0010, 0011** | ❌ faltan |
| Funciones **evento-config, media-subir, evento-cierre, diagnostico** | ❌ sin desplegar |
| Función **`token`** (del primer intento fallido) | ⚠️ sigue viva, hay que borrarla |
| PR **#4** (pase firmado) y **#17** (todo lo de hoy) | abiertos, sin fusionar |
| Vercel | 🔴 cuota agotada: nada se puede desplegar |

> 🎁 **La buena noticia:** los bloques A, B y C **no dependen de Vercel**. Puedes
> hacerlos hoy mismo, aunque la cuota siga bloqueada. Todo es aditivo: no cierra
> ni rompe nada, y las apps en vivo siguen funcionando igual mientras tanto.

---

## 🅐 Supabase: las migraciones (hoy)

En **SQL Editor**, una por una y en este orden. Después de cada una, comprueba que
dice *Success*.

- [ ] **A1 · `0005_pagos.sql`** — entera.
      ⚠️ **Aunque los cobros estén apagados, esta va primero:** crea la tabla
      `subscriptions`, y la `0008` la nombra. Sin ella, la `0008` falla a mitad.

- [ ] **A2 · `0008_rls_tenant_rol.sql`** — entera.
      Es la que deja que cada salón vea solo lo suyo. **Sin esto no se pueden dar
      de alta eventos**, así que va antes que nada de lo demás.

- [ ] **A3 · `0009_llave_anfitrion.sql`** — **hasta antes del "BLOQUE FINAL"**.
      No corras el bloque final todavía (está comentado; el corte es el bloque E).

- [ ] **A4 · `0010_candado_fotos.sql`** — **hasta antes del "BLOQUE FINAL"**.

- [ ] **A5 · `0011_diagnostico.sql`** — entera. No tiene bloque final.

> Los archivos están en `supabase/migrations/` de la rama `feat/llave-anfitrion`
> (PR #17).

## 🅑 Supabase: las funciones (hoy)

Hacen falta el Supabase CLI y estar dentro de la carpeta del proyecto. Si no
tienes el CLI, también se pueden crear desde el panel de Supabase
(**Edge Functions → Deploy a new function**) pegando el contenido de cada
`index.ts`.

- [ ] **B1** · `supabase functions deploy evento-config --no-verify-jwt`
      *(esta venía pendiente de antes: sin ella el portal del invitado funciona
      en modo demostración)*
- [ ] **B2** · `supabase functions deploy media-subir --no-verify-jwt`
- [ ] **B3** · `supabase functions deploy evento-cierre --no-verify-jwt`
- [ ] **B4** · `supabase functions deploy diagnostico --no-verify-jwt`

Ninguna necesita configurar secretos: Supabase les inyecta las llaves por dentro.

- [ ] **B5 · Limpieza** — borra la función **`token`** y el secreto
      `EVENT_TOKEN_JWT_SECRET`. Son basura del primer intento del pase firmado
      (el que falló). **Comprobado hoy: siguen ahí.**

## 🅒 Ligar tu usuario y comprobar (hoy)

- [ ] **C1 · Ligar tu usuario al salón.** Corre el script `vincular-staff`
      (instrucciones en el PR #5) con tu llave de servicio, con rol **`owner`**.
      Sin esto no puedes crear eventos, ni cerrarlos, ni ver el diagnóstico.

- [ ] **C2 · `pnpm test`** desde la rama del PR #17.
      Ahora deberían **encenderse solas** las 22 pruebas que hoy se saltan
      (llave de anfitrión, candado de fotos, cierre de evento y diagnóstico).
      Si alguna falla, para y avísame antes de seguir.

---

## 🅓 Vercel: desplegar (cuando se libere la cuota)

- [ ] **D1** · Comprueba que Vercel vuelve a construir.
- [ ] **D2** · Fusiona el **PR #4** (pase firmado).
- [ ] **D3** · Espera a que terminen las construcciones de **muro, playlist,
      rsvp, dinámicas y álbum**. No sigas hasta que estén las cinco.
- [ ] **D4** · Fusiona el **PR #17** (todo lo de hoy).
- [ ] **D5** · Espera las construcciones otra vez.
- [ ] **D6 · Verifica en vivo**, con un evento de prueba:
      - Abre **Panel → ¿Está todo bien?** y revisa ese evento: deben salir
        todas las comprobaciones en verde.
      - Sube una foto al álbum: debe funcionar.
      - Con el enlace **de invitado** (sin `&a=`), comprueba que **no aparece**
        el botón de la basura.
      - Con el enlace **de anfitrión** (con `&a=`), comprueba que **sí** aparece.

> Para sacar los enlaces de anfitrión, en el SQL Editor:
> ```sql
> select codigo, nombre,
>        '?e=' || codigo || '&a=' || clave_anfitrion as sufijo_anfitrion
>   from events where estado = 'activo' order by creado desc;
> ```

---

## 🅔 Los cortes (en un rato tranquilo)

> 🚨 **Nunca durante un evento en vivo.** Estos dos pasos son los únicos que
> cierran cosas de verdad. Si algo va mal, cada uno tiene su reversión al lado.

- [ ] **E1 · Corte del pase y del borrado** — el **"BLOQUE FINAL" de la `0009`**.
      ⛔ **NO corras el de la `0006`.** Hace solo la mitad: dejaría el candado
      del pase bien, pero **cualquier invitado seguiría pudiendo borrar la boda
      entera**. El de la `0006` ya está marcado como obsoleto en el propio
      archivo.

- [ ] **E2 · Comprueba** — con el enlace de invitado, intenta borrar una foto:
      **no debe desaparecer**. Con el de anfitrión, sí.

- [ ] **E3 · Corte del almacén** — el **"BLOQUE FINAL" de la `0010`**.

- [ ] **E4 · Comprueba** — una subida directa con la llave pública debe dar
      **403** (el comando está en `CANDADO-FOTOS.md`), y subir una foto desde el
      álbum debe **seguir funcionando**.

---

## 🅕 Lo que no es código

- [ ] **F1** · Rellena `apps/catalogo/src/lib/legal.ts`: el **correo** y el
      **domicilio** del salón. Mientras digan `PENDIENTE`, las páginas legales
      muestran un aviso ámbar.
- [ ] **F2** · Que un **abogado** revise los tres documentos legales y te redacte
      la cláusula de responsable/encargado para el contrato con cada salón.
- [ ] **F3** · Decide **cuántos días** guardas el contenido después del evento y
      ponlo en el aviso (ahora dice "un periodo razonable").
- [ ] **F4** · **Vercel Pro** (~20 USD/mes) — el plan gratis prohíbe el uso
      comercial, y hoy has visto lo que pasa con su cuota.
- [ ] **F5** · **Supabase Pro** (~25 USD/mes) — respaldos diarios, sin pausas por
      inactividad, y más espacio. **El plan gratis da ~1 GB: una sola boda con
      fotos y brindis se lo come.**

---

## Si algo sale mal

Cada migración lleva su reversión escrita al final, comentada. Cada runbook
explica su parte en detalle:

| Tema | Documento |
|---|---|
| Pase firmado (0006) | [`MIGRACION-TOKEN-FIRMADO.md`](MIGRACION-TOKEN-FIRMADO.md) |
| RLS por salón (0008) | [`RLS-TENANT-ROL.md`](RLS-TENANT-ROL.md) *(en `main`)* |
| Llave de anfitrión (0009) | [`LLAVE-ANFITRION.md`](LLAVE-ANFITRION.md) |
| Candado de fotos (0010) | [`CANDADO-FOTOS.md`](CANDADO-FOTOS.md) |
| Diagnóstico (0011) | [`DIAGNOSTICO.md`](DIAGNOSTICO.md) |
| Cerrar un evento | [`CIERRE-DE-EVENTO.md`](CIERRE-DE-EVENTO.md) |
| Documentos legales | [`LEGAL.md`](LEGAL.md) |
| Portal del invitado | [`PORTAL-EVENTO-CONFIG.md`](PORTAL-EVENTO-CONFIG.md) *(en `main`)* |

**Regla de oro de todo esto:** nada de lo de aquí se hace durante un evento en
vivo. Los bloques A, B y C son seguros a cualquier hora; los cortes del bloque E,
solo en un rato tranquilo.
