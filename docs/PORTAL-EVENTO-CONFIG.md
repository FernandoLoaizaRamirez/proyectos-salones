# Portal: configuración real por evento (`evento-config`)

> **Qué es esto:** cómo encender la **resolución real** del portal del evento. Con
> esto, el portal deja de mostrar la config de demostración y pasa a mostrar, para
> **cada evento**, solo las experiencias que ese evento tiene contratadas y con el
> **branding de su salón**.

## Cómo está montado

El plano de control (eventos, planes, funciones, branding) está **cerrado por RLS**:
el invitado, con la llave pública, no puede leerlo. Por eso la config se resuelve en
una **Edge Function pública**:

```
supabase/functions/evento-config/index.ts
```

- Recibe `?e=<codigo>` (el mismo código del enlace del invitado).
- Consulta con la llave **service-role que Supabase inyecta dentro de la función**,
  así esa llave secreta **nunca vive en la app del portal** ni viaja al navegador.
- Devuelve datos **crudos**: nombre del evento, plan + sus funciones, overrides del
  salón y del evento, y el branding. **No** devuelve `tenant_id`, ni datos de
  invitados, ni contenido del evento.
- El **portal** corre `resolveEntitlements` de `@salones/core` con esos datos, así el
  motor comercial sigue teniendo **una sola implementación** (la probada con vitest).

## Requisitos

Ya cumplidos si aplicaste la Fase 0 y el branding: la función solo usa tablas de las
migraciones **0002** (`events`, `tenants`, `plan_features`, `tenant_entitlements`,
`event_overrides`) y **0007** (`tenant_branding`). **No** depende de la 0005 ni de la 0008.

## Desplegar (un paso)

Desde la raíz del repo, con la CLI de Supabase conectada a tu proyecto:

```bash
supabase functions deploy evento-config --no-verify-jwt
```

`--no-verify-jwt` la hace **pública**: el código del evento es la llave, igual que el
enlace del invitado. **No hay secretos que configurar**: Supabase inyecta
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` dentro de la función.

Además, el proyecto de Vercel del **portal** necesita las dos variables públicas
(las mismas del resto de la suite):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Verificar

**1) La función responde.** Con el evento demo (que ya existe desde la 0002):

```bash
curl "https://<tu-proyecto>.supabase.co/functions/v1/evento-config?e=demo" \
  -H "apikey: <tu-anon-key-publica>"
```

Debe devolver un JSON con `evento`, `plan.funciones` (los módulos del plan del salón)
y `branding`. Con un código inventado debe responder **404** (`evento no encontrado`).

**2) El portal usa esa config.** Al abrir el portal con `?e=demo`:

- Aparecen **solo** los módulos habilitados para ese evento.
- Se pinta con los **colores del salón** (si tiene branding en `tenant_branding`).
- Con un código inexistente muestra **"No encontramos este evento"**.
- Desaparece el aviso de *"Modo demostración"* del pie.

## Si algo falla, el portal no se rompe

La degradación es elegante y a propósito:

| Situación | Qué muestra el portal |
|---|---|
| Sin variables de Supabase | Modo **demo**: los 5 módulos, tema por defecto |
| Función no desplegada o error de red | Modo **demo** (mismo comportamiento de antes) |
| Evento inexistente (404) | **"No encontramos este evento"** |
| Todo bien | La config **real** del evento |

## Revertir

Basta con **borrar la función** (`supabase functions delete evento-config`) o quitar
las variables del portal: vuelve solo al modo demostración, sin tocar datos.
