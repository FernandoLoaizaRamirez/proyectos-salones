import { describe, it, expect } from "vitest";

/**
 * PRUEBAS DE AISLAMIENTO (adversariales) contra el Supabase REAL.
 * ---------------------------------------------------------------------------
 * Automatizan lo que antes se hacía a mano con `curl` (ver docs/REVISION-TECNICA.md §8
 * y docs/SERVICIO-GESTIONADO.md, Fase 5). Comprueban que, teniendo la llave PÚBLICA
 * del proyecto (la "publishable/anon", que viaja en el navegador), un intruso NO
 * puede:
 *
 *   1. Leer la tabla `items` sin la llave del evento (encabezado x-evento).
 *   2. Escribir en `items` sin la llave del evento.
 *   3. Ver los datos de un evento usando la llave de OTRO (cruzar burbujas).
 *   4. Leer las tablas del "plano de control" (tenants, events, planes, …),
 *      que nacen cerradas (RLS activada, sin políticas).
 *   5. Listar el bucket de fotos/videos "media".
 *
 * TOCAN LA RED, así que solo corren si están puestas las dos variables públicas
 * de Supabase. Sin ellas, la suite se SALTA (para que `pnpm test` local no falle).
 * En CI se inyectan desde los secrets del repo (ver .github/workflows/ci.yml).
 *
 * Los encabezados replican a los de @salones/sync: `apikey` siempre y, solo si la
 * llave es "legacy" (un JWT que empieza con eyJ), también `Authorization: Bearer`.
 * Ninguna prueba escribe datos: el único POST (escritura sin llave) lo rechaza el
 * servidor por diseño, así que no ensucia la base.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hayEnv = Boolean(URL_ENV && ANON_ENV);

// Si faltan las credenciales, se salta toda la suite (no es un fallo).
const suite = hayEnv ? describe : describe.skip;

// Margen amplio para peticiones de red (por defecto vitest corta a los 5 s).
const RED = 20000;

// Tablas del plano de control (migración 0002). Nacen con RLS y SIN políticas =
// cerradas al público; solo el backend (service-role) las toca. Algunas traen
// semilla (plans/features), pero aun así el rol público no debe ver nada.
const TABLAS_CERRADAS = [
  "tenants",
  "events",
  "plans",
  "features",
  "plan_features",
  "tenant_members",
  "tenant_entitlements",
  "event_overrides",
  "guests",
] as const;

suite("Aislamiento contra el Supabase real", () => {
  // Defaults vacíos y seguros: cuando la suite se salta, estos valores no se usan,
  // pero evitan que el cuerpo del describe explote al recolectar sin env.
  const url = (URL_ENV ?? "").replace(/\/$/, "");
  const anon = ANON_ENV ?? "";
  const rest = `${url}/rest/v1`;
  const storage = `${url}/storage/v1`;

  // Mismos encabezados que usa @salones/sync para hablar con PostgREST.
  const auth: Record<string, string> = {
    apikey: anon,
    ...(anon.startsWith("eyJ") ? { Authorization: `Bearer ${anon}` } : {}),
  };
  const headers = (extra: Record<string, string> = {}): Record<string, string> => ({
    ...auth,
    ...extra,
  });

  describe("Candado x-evento (tabla items)", () => {
    it(
      "SIN x-evento, leer items devuelve una lista vacía",
      async () => {
        const res = await fetch(`${rest}/items?select=id,dato&limit=5`, {
          headers: headers(),
        });
        expect(res.status).toBe(200);
        const filas = await res.json();
        expect(Array.isArray(filas)).toBe(true);
        expect(filas).toHaveLength(0);
      },
      RED,
    );

    it(
      "SIN x-evento, escribir en items es rechazado (401)",
      async () => {
        const res = await fetch(`${rest}/items`, {
          method: "POST",
          headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
          body: JSON.stringify({
            evento: "demo",
            coleccion: "prueba-intruso",
            id: "intruso-sin-llave-no-debe-entrar",
            dato: { intruso: true },
          }),
        });
        await res.text().catch(() => {}); // vaciar el cuerpo
        expect(res.ok).toBe(false);
        // El proyecto observó 401 en sus pruebas manuales. Algunos despliegues de
        // PostgREST responden 403 a la misma violación de RLS; ambos = rechazado.
        expect([401, 403]).toContain(res.status);
      },
      RED,
    );

    it(
      "con la llave de un evento NO se ven los de otro (cruzar burbujas)",
      async () => {
        // Pido filas del evento "demo" pero declarando pertenecer a otra burbuja.
        // La RLS solo deja ver filas cuyo `evento` == x-evento, así que la
        // intersección con el filtro evento=eq.demo es necesariamente vacía:
        // conocer el código de otro evento + la llave pública no basta.
        const res = await fetch(`${rest}/items?evento=eq.demo&select=id,dato&limit=5`, {
          headers: headers({ "x-evento": "burbuja-ajena-que-no-existe" }),
        });
        expect(res.status).toBe(200);
        const filas = await res.json();
        expect(Array.isArray(filas)).toBe(true);
        expect(filas).toHaveLength(0);
      },
      RED,
    );
  });

  describe("Plano de control cerrado al público", () => {
    it.each(TABLAS_CERRADAS)(
      'la tabla "%s" no expone filas con la llave pública',
      async (tabla) => {
        const res = await fetch(`${rest}/${tabla}?select=*&limit=1`, {
          headers: headers(),
        });
        if (res.ok) {
          // RLS activada sin políticas: el rol público recibe 200 con lista vacía.
          const filas = await res.json();
          expect(Array.isArray(filas)).toBe(true);
          expect(filas).toHaveLength(0);
        } else {
          // O bien el servidor rechaza de plano el acceso.
          await res.text().catch(() => {});
          expect([401, 403, 404]).toContain(res.status);
        }
      },
      RED,
    );
  });

  describe("Bucket media (almacén de fotos/videos)", () => {
    it(
      "no se puede LISTAR el contenido del bucket",
      async () => {
        // El bucket es público para VER una foto por su URL directa, pero listar
        // su contenido exige una política de lectura sobre storage.objects que no
        // existe (solo hay política de subida). Así, listar no revela nada.
        const res = await fetch(`${storage}/object/list/media`, {
          method: "POST",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({ prefix: "", limit: 100, offset: 0 }),
        });
        if (res.ok) {
          const objetos = await res.json();
          expect(Array.isArray(objetos)).toBe(true);
          expect(objetos).toHaveLength(0);
        } else {
          await res.text().catch(() => {});
          expect([400, 401, 403]).toContain(res.status);
        }
      },
      RED,
    );
  });
});
