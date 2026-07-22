# Migración del candado: `x-evento` → pase firmado (Fase 1)

> **Qué es esto:** el instructivo para cambiar, **sin romper nada en vivo**, el
> candado del servidor de "la llave del evento escrita en cada petición"
> (`x-evento`, Fase 5) a un **pase firmado y de corta duración**. Es el paso #4
> de la Fase 1 en [`FASE-0-1-PLATAFORMA.md`](FASE-0-1-PLATAFORMA.md) — "el más
> cuidado".
>
> **Para quién:** Fernando ejecuta el paso de producción (un SQL); el código y
> las pruebas ya están en la rama `feat/token-firmado` (PR #4).

## En una frase

Hoy la llave del evento viaja en crudo en cada petición. Con este cambio, la app
pide por dentro un **pase firmado** (caduca en 30 min) y lo usa para entrar. **El
invitado no nota ningún cambio**; la seguridad sube (el pase caduca, no se puede
forjar, y no queda un código reutilizable dando vueltas).

## Cómo funciona (y por qué así)

Todo ocurre **dentro de tu base de datos**:

| Pieza | Qué hace |
|---|---|
| `emitir_pase(p_codigo)` | Comprueba que el evento exista y esté activo, y devuelve `<evento>.<caducidad>.<firma>`. |
| `evento_del_pase(p_pase)` | Verifica la firma y la caducidad, y dice de qué evento es el pase. La usan las políticas RLS. |
| `app_secretos` | El secreto con el que se firma. Tabla **cerrada** (RLS sin políticas): nadie la lee con la llave pública. |

> **Decisión de diseño (20 jul 2026).** El primer intento firmaba un JWT con el
> "JWT secret" del proyecto para que PostgREST lo verificara. **No funciona
> aquí:** este proyecto ya migró a **llaves de firma asimétricas (ES256)** y
> rechaza los HS256 (`PGRST301: No suitable key or wrong key type`); encima
> Supabase marca el secreto antiguo como "a desactivar". Construir el candado
> sobre esa llave sería construir sobre arena. Esta versión **no depende de las
> llaves de Supabase ni de Edge Functions**: firma y verificación usan el mismo
> secreto en el mismo sitio, y el secreto **se genera solo dentro de la base y
> nunca sale de ahí** (no hay que copiar/pegar nada).

## Principio de seguridad (por qué no rompe)

- La `@salones/sync` nueva manda **el pase Y el encabezado viejo**. Si el
  servidor aún no tiene el pase, entra por el encabezado (idéntico a hoy).
- La migración `0006` **agrega** la vía del pase sin quitar la del encabezado.
- Solo el **paso de corte** (el último) apaga el encabezado viejo, y se hace
  cuando **todas** las apps ya mandan el pase.

---

## El encendido, por etapas

> ⚠️ **Regla de oro:** el **paso 4 (corte)** NO se hace durante un evento en vivo.
> Los pasos 1–3 son aditivos y seguros a cualquier hora.

### Paso 1 — Aplicar la migración `0006`

Supabase → **SQL Editor** → pega
[`supabase/migrations/0006_pase_firmado.sql`](../supabase/migrations/0006_pase_firmado.sql)
**hasta antes del "BLOQUE FINAL"** (ese bloque está comentado; es para el paso 4)
→ **Run**.

Las apps viejas siguen funcionando por el encabezado. Comprobación rápida (SQL):

```sql
select emitir_pase('demo');   -- debe devolver algo como  demo.1784570160.9f3c...
```

### Paso 2 — Publicar la `@salones/sync` nueva

1. Fusiona el PR **#4** (`feat/token-firmado`) a `main`. Vercel desplegará solo
   las 5 apps conectadas (muro, playlist, rsvp, dinámicas, álbum).
   *(Es seguro aunque el paso 1 no estuviera: la sync nueva cae al encabezado.)*
2. **Espera** a que las 5 apps terminen de desplegar en Vercel.

### Paso 3 — Verificar

- En GitHub, el CI ya corre solo: las 4 pruebas de
  [`tests/aislamiento/pase.test.ts`](../tests/aislamiento/pase.test.ts) **se
  activan solas** al detectar la migración aplicada. Deben salir en verde.
- Prueba manual: abre una app con un `?e=` real y comprueba que lee y escribe
  normal (en la pestaña de red del navegador verás la llamada a
  `/rest/v1/rpc/emitir_pase`).

### Paso 4 — EL CORTE (apagar el encabezado viejo) · en un rato tranquilo

Cuando el paso 3 esté verde y **todas** las apps manden el pase:

1. Supabase → **SQL Editor** → corre el **"BLOQUE FINAL"** que está al final de
   [`0006_pase_firmado.sql`](../supabase/migrations/0006_pase_firmado.sql) (las 4
   políticas que quedan **solo** con el pase).
2. Verifica de nuevo (paso 3). A partir de aquí el encabezado `x-evento` ya no
   abre nada: solo el pase firmado.

### Paso 5 — Limpieza (opcional)

- Quitar el envío del encabezado `x-evento` del cliente en `@salones/sync`
  (ya no hace falta). Cambio pequeño y aparte.
- **Borrar la Edge Function `token`** que se desplegó en el primer intento (ya no
  se usa) y su secreto `EVENT_TOKEN_JWT_SECRET`, en *Edge Functions*.

---

## Cómo revertir (si algo sale mal)

- **Tras el paso 4:** vuelve a correr el **bloque de CONVIVENCIA** (la parte de
  arriba de `0006`) → el encabezado vuelve a funcionar al instante.
- **Pasos 1–2:** son aditivos; si el pase fallara, las apps siguen entrando por
  el encabezado sin que hagas nada (la sync es no-fatal).

## Nota técnica (para el revisor)

El pase es `<evento>.<exp>.<HMAC-SHA256(secreto, "<evento>.<exp>")>` en
hexadecimal. Firmar y verificar ocurren ambos en Postgres (pgcrypto), así que no
hay riesgo de incompatibilidad entre lenguajes ni dependencia del sistema de
llaves de Supabase. `emitir_pase` y `evento_del_pase` son `security definer` con
`search_path` fijado; leen el secreto de `app_secretos` (RLS cerrada) y **nunca lo
devuelven**. `evento_del_pase` es `stable`, así que se evalúa una vez por
consulta. El modelo de confianza sigue siendo "capacidad por evento" (conocer el
código), ahora entregada como pase efímero y no falsificable; la distinción
anfitrión/invitado y la revocación quedan como evolución futura.
