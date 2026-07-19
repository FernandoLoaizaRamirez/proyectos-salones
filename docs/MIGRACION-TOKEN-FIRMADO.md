# Migración del candado: `x-evento` → token firmado (Fase 1)

> **Qué es esto:** el instructivo para cambiar, **sin romper nada en vivo**, el
> candado del servidor de "la llave del evento escrita en cada petición"
> (`x-evento`, Fase 5) a **un pase firmado y de corta duración** (un JWT que
> emite una Edge Function). Es el paso #4 de la Fase 1 en
> [`FASE-0-1-PLATAFORMA.md`](FASE-0-1-PLATAFORMA.md) — "el más cuidado".
>
> **Para quién:** Fernando ejecuta los pasos de producción (Supabase/Vercel);
> el código, la migración y las pruebas ya están listos en la rama
> `feat/token-firmado`.

## En una frase

Hoy la llave del evento viaja en crudo en cada petición. Con este cambio, el
navegador del invitado le pide por dentro un **pase firmado por tu servidor**
(caduca en 30 min) y lo usa para entrar. **El invitado no nota ningún cambio**;
la seguridad sube (el pase caduca, no se puede forjar, y no queda un código
reutilizable dando vueltas).

## Las piezas (ya construidas en la rama)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Edge Function | [`supabase/functions/token/index.ts`](../supabase/functions/token/index.ts) | Recibe `?e=codigo`, valida el evento y devuelve el pase (JWT `role=anon` + `evento`, 30 min). |
| Migración `0006` | [`supabase/migrations/0006_token_firmado.sql`](../supabase/migrations/0006_token_firmado.sql) | Las políticas RLS aceptan el header viejo **o** el claim del pase (convivencia). |
| `@salones/sync` | [`packages/sync/src/index.ts`](../packages/sync/src/index.ts) | Pide y cachea el pase, lo manda como `Authorization`, **sigue mandando `x-evento`** (convivencia). No-fatal: si el pase falla, funciona por el header. |
| Pruebas | [`tests/aislamiento/token.test.ts`](../tests/aislamiento/token.test.ts) | Verifican el pase contra el Supabase real. Se **auto-saltan** hasta que la función esté desplegada. |

## Principio de seguridad (por qué no rompe)

Cada pieza es **compatible hacia atrás**:

- La `@salones/sync` nueva manda **el pase Y el header**. Si el pase aún no
  existe, entra por el header (idéntico a hoy).
- La migración `0006` **agrega** la vía del pase sin quitar la del header: una
  app vieja entra por header, una nueva por el pase.
- Solo el **paso de corte** (el último) apaga el header, y se hace cuando **todas**
  las apps ya mandan el pase.

---

## El encendido, por etapas

> ⚠️ **Regla de oro:** el **paso 5 (corte)** NO se hace durante un evento en vivo.
> Agéndalo en un rato tranquilo. Los pasos 1–4 son aditivos y seguros a cualquier hora.

### Paso 0 — Conseguir el "secreto de firma"

El pase se firma con el **JWT Secret** de tu proyecto (así PostgREST lo acepta):

1. Supabase → tu proyecto `cpbfisylcquuahrmyaca` → **Project Settings → API**.
2. Sección **JWT Settings** → **JWT Secret** → *Reveal* → **copia** ese texto largo.

*(Guárdalo un momento; lo pegas en el paso 1.)*

### Paso 1 — Desplegar la Edge Function `token` + su secreto

**Opción A — Panel de Supabase (recomendada, sin instalar nada):**
1. Supabase → **Edge Functions** → **Deploy a new function** (o "Create function").
2. Nombre: **`token`**. Pega el contenido de
   [`supabase/functions/token/index.ts`](../supabase/functions/token/index.ts).
3. **Desactiva "Verify JWT"** (la función es pública: valida el código por dentro).
4. Deploy.
5. En **Edge Functions → Secrets** (o *Project Settings → Edge Functions*), agrega:
   - `EVENT_TOKEN_JWT_SECRET` = el JWT Secret del paso 0.
   *(`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase solos.)*

**Opción B — Línea de comandos (si tienes la CLI de Supabase):**
```bash
supabase functions deploy token --no-verify-jwt --project-ref cpbfisylcquuahrmyaca
supabase secrets set EVENT_TOKEN_JWT_SECRET="<el JWT Secret>" --project-ref cpbfisylcquuahrmyaca
```

**Verificación rápida del paso 1** (en una terminal; usa tu llave publishable):
```bash
curl -s "https://cpbfisylcquuahrmyaca.supabase.co/functions/v1/token?e=demo" \
  -H "apikey: sb_publishable_..." | head -c 200
# Debe devolver algo como {"token":"eyJ...","exp":...}
```

### Paso 2 — Aplicar la migración `0006` (convivencia)

Supabase → **SQL Editor** → pega
[`supabase/migrations/0006_token_firmado.sql`](../supabase/migrations/0006_token_firmado.sql)
**hasta antes del "BLOQUE FINAL"** (ese bloque está comentado y es para el paso 5).
**Run.** Las apps viejas siguen funcionando por el header.

### Paso 3 — Publicar la `@salones/sync` nueva (deja que se desplieguen las apps)

1. Fusiona la rama `feat/token-firmado` a `main` (o dime y lo hago). Vercel
   desplegará solo las 5 apps conectadas (muro, playlist, rsvp, dinámicas, álbum).
   *(Es seguro aunque el paso 1/2 no estuvieran: la sync nueva cae al header.)*
2. **Espera** a que las 5 apps terminen de desplegar en Vercel.

### Paso 4 — Verificar que el pase funciona

- En GitHub, el CI ya corre solo: las 4 pruebas de
  [`token.test.ts`](../tests/aislamiento/token.test.ts) **se activan solas** al
  detectar la función desplegada. Deben salir en verde.
- Prueba manual: abre una de las apps con un `?e=` real y comprueba que lee y
  escribe normal (la pestaña de red del navegador mostrará una llamada a
  `/functions/v1/token`).

### Paso 5 — EL CORTE (apagar el header viejo) · en un rato tranquilo

Cuando el paso 4 esté verde y **todas** las apps ya manden el pase:

1. Supabase → **SQL Editor** → corre el **"BLOQUE FINAL"** (las 4 políticas que
   quedan **solo** con el claim del pase), que está al final de
   [`0006_token_firmado.sql`](../supabase/migrations/0006_token_firmado.sql).
2. Verifica de nuevo (paso 4). A partir de aquí, el header `x-evento` ya no abre
   nada: solo el pase firmado.

### Paso 6 — Limpieza (opcional, más adelante)

Quitar el envío del header `x-evento` del cliente en `@salones/sync` (ya no hace
falta). Es un cambio pequeño y aparte; no corre prisa.

---

## Cómo revertir (si algo sale mal)

- **Tras el paso 5:** vuelve a correr el **bloque de CONVIVENCIA** (la parte de
  arriba de `0006`) en el SQL Editor → el header vuelve a funcionar al instante y
  las apps que fallaran recuperan el acceso.
- **Pasos 1–3:** son aditivos; si el pase no sirve, las apps siguen entrando por
  el header sin que hagas nada (la sync es no-fatal).

## Nota técnica (para el revisor)

El pase es un JWT **HS256** firmado con el JWT Secret del proyecto, con
`{ role: "anon", evento: <codigo>, exp }`. PostgREST lo verifica de forma nativa
y expone el claim en `request.jwt.claims`, que la RLS lee. Si el proyecto ya
migró a **llaves de firma asimétricas** y el JWT Secret legacy no verificara,
el paso 4 lo detecta (los tests fallarían) y habría que ajustar la firma a la
nueva llave; no cambia el resto del diseño. El modelo de confianza sigue siendo
"capacidad por evento" (conocer el código), ahora entregada como pase efímero;
la distinción anfitrión/invitado y la revocación quedan como evolución futura.
