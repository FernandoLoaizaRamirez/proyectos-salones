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

### Ahora (5 minutos)

Rellenar `apps/catalogo/src/lib/legal.ts`:

```ts
salon:     "Hacienda Santa Renata",     // el salón, no tú
contacto:  "PENDIENTE",  // ← correo donde el SALÓN atiende a los invitados
domicilio: "PENDIENTE",  // ← domicilio del SALÓN. La ley lo exige.
```

Mientras digan `PENDIENTE`, las páginas muestran el aviso ámbar.

### Antes de cobrarle a alguien

1. **Que un abogado revise los tres documentos.**
2. **Añadir la cláusula de responsable/encargado** a tu contrato con el salón.
3. Decidir tu política de conservación: cuántos días guardas el contenido después
   del evento. Ahora mismo el texto dice *"un periodo razonable"*, que es un
   marcador de posición: hay que poner un número.

## 4. Lo que sigue faltando

Esto cubre lo escrito. Quedan cosas que son **de sistema**, no de texto:

- **No hay borrado ni entrega automáticos al cerrar un evento.** El aviso promete
  que el contenido se elimina cuando el salón lo pide; hoy eso es a mano. Es el
  tapón 3 de la auditoría.
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
- `apps/catalogo/src/lib/legal.ts` — los datos del salón + `camposPendientes()`

Relacionado: [`CANDADO-FOTOS.md`](CANDADO-FOTOS.md), [`LLAVE-ANFITRION.md`](LLAVE-ANFITRION.md).
