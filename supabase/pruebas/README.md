# Probar una migración ANTES de pegarla en producción

Las migraciones de este proyecto se corren **a mano**, pegándolas en el SQL Editor
de Supabase. Eso significa que la primera vez que un SQL se ejecuta de verdad es
sobre la base **en vivo**, con las bodas dentro. No es un buen sitio para
descubrir que falta un punto y coma.

Aquí hay un banco de pruebas para ejecutarlas antes, contra un Postgres de usar y
tirar. Tarda dos minutos y no toca nada de nadie.

## Qué hay

| Archivo | Para qué |
|---|---|
| `00-banco.sql` | Recrea lo justo de la base real (`items`, su disparador de la 0003 y un doble de `evento_del_pase_anfitrion`) para que una migración pueda correr sola. |
| `01-candado-0016.sql` | Las 18 comprobaciones del candado de sobrescritura: qué frena a un invitado, qué le sigue dejando hacer, y que ni el anfitrión ni las Edge Functions se ven afectados. |

## Cómo se corre

Hace falta un Postgres cualquiera. Con Docker:

```bash
docker run -d --name pg-prueba -e POSTGRES_PASSWORD=prueba -p 55432:5432 postgres:16
```

O, si ya tienes Postgres instalado, uno desechable en un puerto aparte:

```bash
initdb -D /tmp/pgprueba -U postgres -A trust && pg_ctl -D /tmp/pgprueba -o "-p 55432" start
```

Y después, en orden:

```bash
psql -h 127.0.0.1 -p 55432 -U postgres -f supabase/pruebas/00-banco.sql
```

```bash
psql -h 127.0.0.1 -p 55432 -U postgres -v ON_ERROR_STOP=1 -f supabase/migrations/0016_candado_sobrescritura.sql
```

```bash
psql -h 127.0.0.1 -p 55432 -U postgres -f supabase/pruebas/01-candado-0016.sql
```

Todas las líneas tienen que decir `ok`. Si alguna dice `FALLO`, **no pegues esa
migración en producción**.

## Dos avisos

- **Los roles de Supabase no existen aquí.** `anon`, `authenticated` y
  `service_role` los crea Supabase. Si una migración los menciona (la `0015`, por
  ejemplo), créalos antes o dará `no existe el rol «anon»` — y ese error concreto
  **no** significa que la migración esté mal:

  ```bash
  psql -h 127.0.0.1 -p 55432 -U postgres -c "create role anon nologin; create role authenticated nologin; create role service_role nologin;"
  ```

- **Esto no sustituye a la revisión.** El banco reproduce la tabla `items` y poco
  más: no hay almacenamiento, ni Edge Functions, ni las políticas RLS reales. Sirve
  para lo que más falla —que el SQL sea válido, que sea idempotente y que la lógica
  del disparador haga lo que dice— no para dar por buena una migración entera.

## Lo que ya se comprobó así (10 ago 2026)

- **`0016`** corre limpia, pasa sus 18 comprobaciones y es **idempotente**:
  pegarla dos veces deja la lista blanca en 6 renglones, no en 12.
- **`0015`** corre limpia con los roles creados, y su tope funciona: la llamada
  número 301 del evento `demo` en una hora ya devuelve `false`.
