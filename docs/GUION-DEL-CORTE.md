# El guión del corte (bloque E)

Es el momento más delicado de todo el proyecto. Este documento existe para que
ese día **no haya que pensar ni buscar nada**: se sigue el papel, de arriba
abajo, y se para en cuanto algo no coincida.

Los tres cortes están repartidos entre tres archivos `.sql`, cada uno con su
bloque comentado al pie. Aquí están los tres juntos, en orden, con lo que hay que
comprobar antes y después de cada uno.

> **Regla de oro: NUNCA durante un evento.** Ni "un ratito entre baile y baile".
> Si hay una boda esa noche, se hace otro día.

---

## Antes de tocar nada: las 4 comprobaciones

Si cualquiera falla, **no se empieza**. Cortar con una de estas mal deja apps
rotas en vivo.

| # | Qué | Cómo se comprueba |
|---|---|---|
| 1 | **Las 5 apps desplegadas con la sync nueva** — muro, playlist, rsvp, dinámicas y álbum | En el panel de Vercel, que el último despliegue de producción de cada una sea **posterior** a la fusión del #17. Ojo con muro y rsvp, que se quedaron atrás el 22 jul |
| 2 | **El portal y el panel también** | Son los que muestran las fotos; si van atrasados, el corte de la 0013 deja los álbumes vacíos |
| 3 | **Las 5 Edge Functions vivas** | `npx supabase functions list --project-ref cpbfisylcquuahrmyaca` → las 5, con `verify_jwt: false` |
| 4 | **El centinela en verde** | `pnpm exec vitest run tests/aislamiento/centinela.test.ts` → "Todas las piezas están encendidas" |

Y una más, de sentido común: **ten a mano el enlace de anfitrión** de un evento
de prueba. Se saca con esto en el SQL Editor:

```sql
select codigo, nombre, clave_anfitrion,
       '?e=' || codigo || '&a=' || clave_anfitrion as sufijo_anfitrion
  from events
 where estado = 'activo'
 order by creado desc;
```

Ese sufijo se pega detrás de la dirección de cualquier app. **Es privado**: quien
lo tenga puede borrar.

---

## Corte 1 · La llave del anfitrión (migración 0009)

Apaga el candado viejo (el encabezado `x-evento`) y deja el **borrado solo en
manos del anfitrión**.

> 🚨 **Este bloque SUSTITUYE al de la migración 0006. No corras el de la 0006:**
> dejaría el candado bien pero con cualquier invitado pudiendo borrar la boda
> entera. El de la 0006 ya está marcado como obsoleto en su propio archivo.

**Qué se pega:** el bloque final de `supabase/migrations/0009_llave_anfitrion.sql`
(las 4 políticas: lectura, escritura, actualización y borrado).

**Comprobar después** — abre el álbum o el muro de un evento real (no `demo`):

- [ ] Con el enlace **de invitado** (sin `&a=`): se ven las cosas y se puede
      escribir, pero **no aparece el botón de borrar**.
- [ ] Con el enlace **de anfitrión** (con `&a=`): **sí aparece** y borra de verdad.
- [ ] Las apps siguen cargando datos (si algo quedó sin desplegar, aquí se nota:
      se queda vacío).

**Si algo sale mal:** volver a correr el bloque 5) de CONVIVENCIA que está más
arriba en ese mismo archivo. Todo vuelve a aceptar los dos candados.

---

## Corte 2 · El almacén de fotos (migración 0010)

Quita el permiso de "cualquiera puede subir". A partir de ahí solo se sube con
un permiso firmado que reparte la función `media-subir`.

**Qué se pega:**

```sql
drop policy if exists "subida publica media" on storage.objects;
```

**Comprobar después:**

- [ ] Subir una foto desde el portal **funciona** (usa el camino firmado).
- [ ] Un intento de subida directa con la llave pública responde **403**.

**Si algo sale mal:**

```sql
create policy "subida publica media" on storage.objects for insert
  with check (bucket_id = 'media');
```

---

## Corte 3 · Las fotos privadas (migración 0013)

El almacén deja de ser público: las fotos solo se ven con una dirección firmada
que caduca en una hora.

> ⚠️ Este es el que más se puede notar si algo falta, porque afecta a **fotos que
> ya están subidas**. El 22 jul se encontró y arregló justo la trampa que lo
> habría estropeado: el portal y el panel del anfitrión pintaban las direcciones
> guardadas tal cual. Con ese arreglo desplegado, este corte es seguro; **sin él,
> los álbumes se ven vacíos**.

**Qué se pega:**

```sql
update storage.buckets set public = false where id = 'media';
```

> ✅ **El brindis ya está listo para este corte** (24 jul 2026, commit del
> `feat(brindis): firma las direcciones del video recuerdo en el servidor`). Su
> video recuerdo se arma en Shotstack, que descarga los videos desde su servidor;
> ahora `apps/brindis/src/app/api/recuerdo/route.ts` firma las direcciones con
> `resolverMedios` antes de mandárselas, así que seguirán sirviendo con el bucket
> privado. La galería del brindis ya estaba resuelta. **Ya no hay nada que hacer
> antes de este corte por el brindis** — solo confirmar que su despliegue con ese
> commit está en vivo (`comprobar-apps-al-dia.mjs` lo cubre).

**Comprobar después:**

- [ ] El álbum del **portal** se sigue viendo igual.
- [ ] El álbum del **panel del anfitrión** también, y "descargar todo" funciona.
- [ ] Copiar la dirección de una foto tal como está guardada en la base y abrirla
      en el navegador → ahora debe dar **error** (antes se veía). Eso es el
      agujero cerrado.

**Si algo sale mal:**

```sql
update storage.buckets set public = true where id = 'media';
```

Ninguna foto se pierde: revertir devuelve todo al estado anterior.

---

## Al terminar

- [ ] Correr las pruebas una vez más: `pnpm test` — deben seguir las 214 en verde.
- [ ] Anotar la fecha del corte aquí abajo.

**Cortes realizados:**

| Corte | Fecha | Notas |
|---|---|---|
| 0009 · llave del anfitrión | 24 jul 2026 | ✅ HECHO. Verificado en vivo: x-evento viejo → 0 filas; el pase lee los datos; el borrado de un invitado (solo pase) fue RECHAZADO. Antes, arreglado el álbum del portal (el invitado ya no ve el botón de borrar con servidor). |
| 0010 · almacén cerrado | 24 jul 2026 | ✅ HECHO. Verificado: subida directa con la llave pública → HTTP 400 (bloqueada); `media-subir` con pase sigue devolviendo URL firmada. |
| 0013 · fotos privadas | | ⏳ PENDIENTE (el único que queda). ✅ El bloqueo del brindis-Shotstack YA está resuelto (firma en el servidor). Listo para correr en un rato tranquilo. |
