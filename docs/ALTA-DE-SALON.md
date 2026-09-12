# Dar de alta un salón

Cómo pasar de "un salón dijo que sí" a "el salón está trabajando en su panel".

Antes eran tres pasos manuales y dos exigían entrar a la consola de Supabase o
escribir SQL. Ahora es **un comando y un mensaje de WhatsApp**.

---

## El comando

```bash
node --env-file=.env.local apps/catalogo/scripts/alta-salon.mjs --nombre="Jardín Los Encinos" --slug=los-encinos --correo=ana@losencinos.mx
```

Esa línea funciona **igual en PowerShell y en bash**. Es a propósito: la forma
vieja (`SUPABASE_URL=... node ...`) es sintaxis de bash y falla en PowerShell,
que es la consola de todos los días en Windows.

**Una sola vez**, al `.env.local` de la raíz (que ya está en `.gitignore`) hay
que añadirle:

```
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<la llave secreta: Project Settings → API>
```

Es la llave de administrador. **Nunca** se sube al repo ni se pone en Vercel.

Opcionales: `--plan=gestionado` (por defecto), `--ciudad="Culiacán"`,
`--rol=owner` (por defecto).

## Qué hace

Los cinco pasos, todos idempotentes (correrlo dos veces deja lo mismo):

1. **El salón** — `tenants`, buscado por su `slug`. Si ya existía, lo reutiliza.
2. **La cuenta** — la crea en Supabase Auth con una contraseña temporal. Si el
   correo ya tenía cuenta, la reutiliza y **no** le cambia la contraseña.
3. **El vínculo** — la fila de `tenant_members` y, sobre todo, la identidad
   (`tenant_id` + `rol`) grabada en `app_metadata`, que es la que viaja firmada
   dentro del token y la que lee la RLS. Es el mismo código probado que usa
   `vincular-staff.mjs` (vive en `scripts/lib/vincular.mjs`).
4. **La marca**, solo con el nombre. Arranca casi en blanco a propósito: que el
   salón se vista solo es parte de la venta.
5. **La fila legal, vacía y sin publicar.** Así el aviso ámbar de su panel se
   enciende desde el minuto uno y el salón sabe qué le falta.

### Por qué contraseña y no una invitación por correo

En el plan gratis de Supabase el correo integrado es de juguete: unos pocos por
hora y suele caer en spam. Cerrar la venta, apretar el botón y quedarte sin nada
que enviarle al cliente es peor que un comando feo que sí entrega credenciales.

Por eso el script **imprime al final** el correo, la contraseña temporal y los
dos enlaces, listos para pegar en un WhatsApp.

## Lo que se le manda al salón

```
Entra aquí:   https://suite-salones.vercel.app/entrar
Correo:       ana@losencinos.mx
Contraseña:   <la que imprimió el script>   (cámbiala al entrar)

Lo PRIMERO: https://suite-salones.vercel.app/panel/legal
```

**Insiste en ese "lo primero".** Hasta que el salón rellene su razón social, su
domicilio y su correo y apriete *Publicar*, el aviso de privacidad de sus
eventos no lleva sus datos: dice "tu salón anfitrión" y remite a su personal. Es
correcto y es honesto, pero no es lo que quiere un cliente que ya pagó.

## La lista de comprobación de un cliente nuevo

1. Correr el comando. ✅
2. El salón entra y **cambia su contraseña**.
3. Panel → **Documentos legales** → sus datos → **Publicar**.
4. Panel → **la marca del salón** → sus colores y su logo.
5. Su primer evento, y desde la ficha del evento: las experiencias que contrató.

## Si algo sale mal

- **"Ese salón (tenant) no existe"** al correr `vincular-staff.mjs`: ese script
  es la puerta de atrás para reparar altas viejas; para un salón nuevo usa
  `alta-salon.mjs`, que crea el salón antes de vincular.
- **"No pude preparar los datos legales"**: falta correr la migración 0033. El
  resto del alta sí quedó hecha; se puede volver a correr el comando después.
- **El salón entra pero no ve nada suyo**: su token es viejo. Que cierre sesión
  y vuelva a entrar — la identidad viaja dentro del token y se refresca al
  iniciar sesión.

---

Relacionado: [`LEGAL.md`](LEGAL.md), [`RLS-TENANT-ROL.md`](RLS-TENANT-ROL.md),
[`GUIA-WHITE-LABEL.md`](GUIA-WHITE-LABEL.md).
