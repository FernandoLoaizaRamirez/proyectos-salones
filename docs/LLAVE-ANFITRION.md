# La llave del anfitrión — que solo quien organiza pueda borrar

> Migración `supabase/migrations/0009_llave_anfitrion.sql`
> Runbook para encenderla. Léelo entero antes de tocar nada.

---

## 1. El problema que arregla

Hasta ahora, un evento tenía **una sola llave**: su código, el `?e=` que va en el
QR. Ese código lo tienen **todos los invitados** — es justamente lo que escanean
para entrar.

Y con ese código se podía **borrar**. Es decir: cualquier invitado de la boda
podía vaciar el álbum de fotos, el muro de mensajes, la lista de canciones o las
confirmaciones. Un dedo mal puesto en el botón de la basura, o un invitado
molesto, y la boda se quedaba sin recuerdos. Sin forma de recuperarlos.

## 2. Cómo queda ahora: dos llaves

| | La llave del **invitado** | La llave del **anfitrión** |
|---|---|---|
| Qué es | El código del evento (`?e=boda-x7k2`) | Una clave privada (`&a=9f3c…`) |
| Quién la tiene | Todos, va en el QR | Solo quien organiza |
| Puede **ver** | Sí | Sí |
| Puede **aportar** (firmar, subir foto, pedir canción, confirmar) | Sí | Sí |
| Puede **borrar y moderar** | **No** | **Sí** |

Las dos se canjean por un **pase firmado** que caduca a los 30 minutos y que la
propia base de datos emite y verifica. Los dos pases se firman con **secretos
distintos**, así que un pase de invitado nunca puede hacerse pasar por uno de
anfitrión.

El enlace del anfitrión es simplemente el de siempre con la clave añadida:

```
Invitados:  https://proyectos-salones-muro.vercel.app/?e=boda-x7k2
Anfitrión:  https://proyectos-salones-muro.vercel.app/?e=boda-x7k2&a=9f3c8b1d4e2a7f60
```

La app **recuerda** la clave en ese teléfono, así que el anfitrión pega su enlace
una vez y ya. Los botones de borrar solo le aparecen a él.

> **El evento `demo` es la excepción a propósito:** cualquiera puede moderarlo,
> porque es la vitrina pública con contenido de mentira. Así las demostraciones
> siguen funcionando completas sin repartir llaves.

---

## 3. Encendido — los pasos, en orden

> ⚠️ **Nada de esto se hace durante un evento en vivo.**

### Paso 0 · Antes de empezar

Esta migración necesita que la **0006** (pase firmado) ya esté aplicada. Ya lo
está: fue verificada en producción el 20 jul 2026.

Necesitas además que el **PR #4** (pase firmado) esté fusionado y desplegado,
porque el corte de abajo apaga el candado viejo. Si no lo está, para aquí y
haz primero el PR #4.

### Paso 1 · Aplicar la migración

En Supabase → **SQL Editor**, pega el contenido de
`supabase/migrations/0009_llave_anfitrion.sql` **hasta antes del "BLOQUE FINAL"**
(el bloque final está comentado; no se ejecuta aunque lo pegues, pero es más
limpio no pegarlo).

Esto **no rompe ni cierra nada todavía**. Solo añade la maquinaria: la clave en
cada evento, el secreto para firmar, y las dos funciones nuevas. Las apps en vivo
siguen funcionando exactamente igual.

**Comprobación:** vuelve a correr las pruebas. Las 6 de `anfitrion.test.ts` se
encienden solas al detectar la migración:

```
pnpm test
```

Deberías ver **61 pruebas en verde** (antes eran 55 + 6 saltadas).

### Paso 2 · Fusionar y desplegar

Fusiona el PR de esta rama y espera a que Vercel construya las **cuatro apps**
que cambian: **muro, álbum, playlist y RSVP**.

> 💡 Vercel tiene cuota de construcciones en el plan gratis. Si se topa, espera a
> que se libere. **No hagas el corte hasta que las cuatro estén desplegadas.**

### Paso 3 · Sacar los enlaces de anfitrión

En el SQL Editor:

```sql
select codigo,
       nombre,
       clave_anfitrion,
       '?e=' || codigo || '&a=' || clave_anfitrion as sufijo_anfitrion
  from events
 where estado = 'activo'
 order by creado desc;
```

Ese `sufijo_anfitrion` se pega al final de la dirección de cualquier app. Guarda
esos enlaces donde guardas las cosas importantes: **quien tenga ese enlace puede
borrar**.

### Paso 4 · Verificar antes de cortar

Con un **evento de prueba** (no uno real), en dos navegadores distintos:

1. Abre el enlace **de invitado** (sin `&a=`). Firma el muro o sube una foto:
   **debe funcionar**. Fíjate en que **no aparece** el botón de la basura.
2. Abre el enlace **de anfitrión** (con `&a=`). **Sí** debe aparecer el botón de
   la basura, y borrar debe funcionar.

### Paso 5 · EL CORTE

Este es el paso que de verdad cierra el candado. Corre el **BLOQUE FINAL** de
`0009_llave_anfitrion.sql` (el que está comentado al pie: quítale los `--`).

Hace dos cosas de una vez:
- apaga el encabezado viejo `x-evento` (queda solo el pase firmado), y
- deja el borrado exclusivamente en manos del anfitrión.

> 🚨 **Este bloque sustituye al bloque de corte de la migración 0006.**
> Corre el de la **0009**, no el de la 0006. El de la 0006 apagaría el header
> viejo pero dejaría el borrado abierto a cualquier invitado.

> 🚨 **Regla de oro:** el corte no se hace durante un evento en vivo. Busca un
> rato tranquilo.

### Paso 6 · La comprobación final (a mano, una sola vez)

Esta es la única que las pruebas automáticas **no** hacen, porque una prueba que
borra datos cuando falla es peor que no tenerla. Con tu evento de prueba:

1. Sube dos fotos con el enlace de invitado.
2. Con el enlace **de invitado**, intenta borrar una. En la interfaz ni siquiera
   verás el botón — eso ya es buena señal.
3. Recarga. **Las dos fotos siguen ahí.**
4. Con el enlace **de anfitrión**, borra una. **Ahora sí desaparece.**

Si el paso 3 falla (la foto desapareció con el enlace de invitado), **revierte**
con el paso 7 y avísame.

### Paso 7 · Cómo revertir

Vuelve a correr el bloque **`5) CONVIVENCIA`** de `0009_llave_anfitrion.sql`.
Todo vuelve a como estaba en un segundo. La migración es aditiva: nada se pierde.

---

## 4. Qué **no** cubre (los límites honestos)

Para que no te lleves sorpresas:

- **Borrar** queda cerrado. **Actualizar** no.
  Los votos de la playlist y las confirmaciones de RSVP se guardan como
  actualizaciones, así que si cerrara eso, rompería el producto. Un invitado no
  puede *destruir* contenido, pero todavía podría *sobrescribir* algo. Cerrar eso
  pide marcar quién creó cada cosa (`created_by`) y es el siguiente incremento.

- **Las fotos y videos siguen sin candado propio.** Este trabajo protege lo que
  vive en la base de datos. Los archivos del almacén son otro problema, con otra
  solución: hoy el bucket es público y cualquiera con el enlace de una foto la
  ve. Es el punto 1 del análisis y va aparte.

- **La clave no rota ni caduca.** Si un anfitrión filtra su enlace, hay que
  cambiarle la clave a mano:
  ```sql
  update events
     set clave_anfitrion = encode(gen_random_bytes(12), 'hex')
   where codigo = 'boda-x7k2';
  ```
  El anfitrión tendrá que pegarse el enlace nuevo.

- **La interfaz no es el candado.** Esconder el botón de la basura es cortesía,
  no seguridad. El candado de verdad está en la base de datos: aunque alguien
  fuerce la interfaz, el servidor rechaza el borrado sin un pase de anfitrión.

---

## 5. Para el que lea el código

- Migración: `supabase/migrations/0009_llave_anfitrion.sql`
- Funciones nuevas: `emitir_pase_anfitrion(codigo, clave)` y
  `evento_del_pase_anfitrion(pase)`
- Encabezado nuevo: `x-evento-anfitrion`
- Formato del pase: `a.<evento>.<caducidad>.<firma HMAC-SHA256>`
  (el de invitado es `<evento>.<caducidad>.<firma>`, sin la `a.`)
- En `@salones/sync`: `claveAnfitrion()`, `olvidarClaveAnfitrion()`,
  `esAnfitrion()` y `sufijoAnfitrion()`. La interfaz `ProveedorSync` **no cambia**
  (restricción de la migración strangler-fig).
- Pruebas: `tests/aislamiento/anfitrion.test.ts` (6, solo lectura, se auto-activan
  cuando la migración está aplicada)

Relacionado: [`MIGRACION-TOKEN-FIRMADO.md`](MIGRACION-TOKEN-FIRMADO.md) (el pase
de invitado, migración 0006).
