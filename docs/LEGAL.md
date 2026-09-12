# La capa legal

> Paquete `packages/legal` · páginas en `apps/catalogo/src/app/legal/`
> Aviso al pie de cada formulario: `AvisoParticipacion` en `@salones/ui`

---

## ⚠️ Lo primero, y va en serio

**Esto no es asesoría legal, y yo no soy abogado.**

Lo que hay aquí son **borradores de trabajo**: describen con honestidad lo que el
sistema hace de verdad, con la estructura que pide la ley mexicana. Eso te ahorra
la parte más aburrida (explicarle a un abogado qué hace tu sistema) y te deja algo
concreto sobre lo que trabajar.

**Antes de firmar un cliente real, un abogado tiene que revisarlos.** Lo que un
abogado aporta y yo no puedo:

- confirmar que la figura de consentimiento es la correcta para tu caso,
- redactar los límites de responsabilidad de forma que aguanten,
- revisar el contrato con el salón (el reparto de responsabilidades),
- decirte si necesitas registrarte ante el INAI o algo equivalente.

Mientras falten datos por rellenar, **las páginas lo dicen en grande** en vez de
fingir que están terminadas. Es a propósito.

---

## 1. La decisión importante: quién responde por los datos

La ley mexicana (LFPDPPP) distingue dos figuras:

| | Quién es | Qué significa |
|---|---|---|
| **Responsable** | **El salón / los anfitriones** | Deciden para qué se usan los datos. **Responden ante la ley y ante los invitados.** |
| **Encargado** | **Tú** (la suite) | Solo tratas los datos por cuenta del salón, siguiendo sus instrucciones. |

**Esto no es un detalle.** Es el salón quien convoca a sus invitados y decide qué
se hace con las fotos de su boda; tú solo pones la herramienta. Si el aviso de
privacidad llevara **tu** nombre como responsable, estarías asumiendo una
responsabilidad legal que le corresponde a tu cliente — y respondiendo tú si un
invitado reclama.

Por eso los documentos van **parametrizados por salón**: cada cliente publica el
suyo, con su nombre, su domicilio y su correo. Hay una prueba automática que
comprueba que no se cuela tu nombre donde debe ir el suyo.

> 📌 **Consecuencia práctica:** necesitas una cláusula en tu contrato con cada
> salón donde quede escrito este reparto. Eso es lo primero que le pedirías al
> abogado.

## 2. Qué hay construido

### Los tres documentos

| Documento | Ruta | Para quién |
|---|---|---|
| **Aviso de privacidad** | `/legal/privacidad` | Los invitados |
| **Términos y condiciones** | `/legal/terminos` | El salón (cliente) |
| **Uso de tu imagen** | `/legal/imagen` | Los invitados |

Viven en `packages/legal` como funciones que reciben los datos del salón. Se
escriben una vez, se revisan una vez, y salen idénticos en las 14 apps.

### El aviso en el momento justo

Para que el consentimiento valga, el invitado tiene que poder enterarse **antes**
de entregar sus datos. Un enlace escondido en el pie no cumple esa función. Por
eso el componente `AvisoParticipacion` va **pegado al botón de enviar** en los
cuatro sitios donde un invitado entrega algo suyo:

- **muro** → al dejar un mensaje
- **álbum** → al subir fotos
- **RSVP** → al confirmar asistencia
- **brindis** → al enviar el video

Es un aviso pequeño y sin fricción, no una casilla obligatoria. Para los datos que
se manejan aquí (nombre, mensaje, fotos del propio evento; nada sensible) esa es
la figura habitual. **Si algún día recoges datos sensibles, esto tiene que pasar a
ser una casilla expresa.**

### Una mentira que había que corregir

El pie del brindis decía a los invitados que *"los videos… no se suben a ningún
servidor"*. **Era falso**: el botón "Enviar a los novios" sí los sube. Quedó
corregido. Decirle a alguien que sus datos no salen de su teléfono cuando sí
salen es exactamente lo que no puede pasar.

## 3. Qué tienes que hacer tú

### Los datos ya NO se editan en el código (cambió el 29 ago 2026)

Hasta esa fecha, los datos del responsable vivían escritos en
`apps/catalogo/src/lib/legal.ts`. Ahí estaba el fallo: el aviso publicado
nombraba responsable al salón de **demostración** y daba el correo personal y el
domicilio particular del proveedor. Con un cliente real, sus invitados leerían
que sus datos los responde otro salón.

**Ahora los rellena cada salón, desde el panel:**

> Panel → **Documentos legales** → razón social, domicilio y correo → **Publicar**

Viven en la tabla `tenant_legal` (migración 0033) y llegan a las páginas por
`evento-config?...&legal=1`. En el código ya no hay datos de nadie.

Tres cosas que conviene saber:

- **Mientras el salón no publique**, sus invitados leen un aviso correcto pero
  impersonal: dice *"tu salón anfitrión"*, no inventa domicilio, y les dice a
  quién acudir. Nunca aparece la palabra `PENDIENTE`.
- **No se puede publicar a medias.** El CHECK `tl_publicado_completo` de la base
  rechaza publicar sin razón social, sin domicilio o sin un correo con forma de
  correo. La regla está en Postgres a propósito: PostgREST es público y un `if`
  de la pantalla no es una regla (la lección de la 0016).
- **Queda constancia de quién publicó un borrador**: `acepto_borrador_en` y
  `acepto_borrador_por`. No dice "un abogado lo revisó" —sería falso, el texto es
  el mismo para todos los salones—, dice que ESE responsable publicó sabiendo
  que era un borrador, el día X. Eso es lo que protege al proveedor.

Los datos del **proveedor** (nombre y dirección del sitio) sí siguen en el
código, y es deliberado: son iguales para todos, y sacarlos de la base
permitiría que un salón se pusiera a sí mismo como proveedor o se borrara la
cláusula de encargado.

### Antes de cobrarle a alguien

1. **Que un abogado revise los tres documentos.** Es lo único de este bloque que
   no puede hacer el software. Llévale [`PARA-EL-ABOGADO.md`](PARA-EL-ABOGADO.md).
   Mientras no exista esa revisión, el salón ve el aviso de borrador en tres
   sitios (la banda de su panel, la casilla obligatoria al publicar, y el
   apartado 10 de los términos) — y el invitado NO lo ve, a propósito.
2. **Añadir la cláusula de responsable/encargado** a tu contrato con el salón.
3. ~~Decidir tu política de conservación.~~ **Resuelto**: es un campo del panel
   ("días que guardas el material tras el evento"). Si el salón lo rellena, su
   aviso lo dice como un compromiso suyo; si lo deja vacío, el texto queda como
   estaba. El sistema no borra nada solo, y el aviso no promete lo contrario.

## 4. Lo que sigue faltando

Esto cubre lo escrito. Quedan cosas que son **de sistema**, no de texto:

- ~~No hay borrado ni entrega al cerrar un evento.~~ **Resuelto**: ya existe
  *Panel → Cerrar un evento*. Ver [`CIERRE-DE-EVENTO.md`](CIERRE-DE-EVENTO.md).
  ~~Queda pendiente poner un número concreto de días de conservación.~~
  **Resuelto** (0033): es un campo por salón en Panel → Documentos legales.
- **No hay registro de consentimiento.** No se guarda quién vio el aviso ni
  cuándo. Para el nivel de datos actual es defendible, pero si un día hace falta
  probarlo, no se puede.
- **Sin aviso de cookies**, porque hoy no hay rastreo de terceros. Si algún día
  añades analítica, hace falta.
- **La lectura de las fotos sigue abierta** (ver `CANDADO-FOTOS.md`). El aviso no
  promete lo contrario, pero conviene cerrarlo.

## 5. Para el que lea el código

- `packages/legal/src/index.ts` — los tres documentos como funciones puras
- `packages/legal/src/legal.test.ts` — 15 pruebas. Comprueban que el aviso lleva
  **los apartados que exige el artículo 16 de la LFPDPPP**, que los datos del
  salón aparecen de verdad, y que no se cuela el nombre del proveedor donde va el
  del responsable. Si alguien edita el texto y se carga una sección, salta.
- `packages/ui/src/components/aviso-participacion.tsx` — el aviso del formulario.
  La dirección se puede cambiar con `NEXT_PUBLIC_LEGAL_URL`.
- `packages/legal/src/salon.ts` — traduce la fila de `tenant_legal` a los datos
  de los documentos. Ahí vive `MODELO_SALON` ("tu salón anfitrión"), que es el
  candado contra publicar `PENDIENTE` en el hueco del nombre.
- `apps/catalogo/src/lib/legal.ts` — de dónde salen los datos (ya NO los datos)
- `apps/catalogo/src/lib/legal-salon.ts` — leer y guardar desde el panel
- `apps/catalogo/src/app/panel/legal/page.tsx` — la pantalla del salón
- `supabase/migrations/0033_legal_por_salon.sql` — la tabla, la RLS y el candado
- Para dar de alta un salón nuevo: [`ALTA-DE-SALON.md`](ALTA-DE-SALON.md)

Relacionado: [`CANDADO-FOTOS.md`](CANDADO-FOTOS.md), [`LLAVE-ANFITRION.md`](LLAVE-ANFITRION.md).
