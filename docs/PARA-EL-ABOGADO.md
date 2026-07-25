# Consulta legal — Suite de apps para eventos en salones

> Documento para llevar al abogado. Reúne el contexto, las decisiones a validar,
> las preguntas concretas y los documentos ya redactados que hay que revisar.
> Objetivo: resolver todo en una sola consulta.

---

## 1. Qué es el servicio (en una página)

Es un conjunto de aplicaciones web que un **salón de eventos** ofrece a sus
clientes (novios/anfitriones) durante una boda u otro evento. Los **invitados**,
desde su teléfono y con un enlace, pueden:

- dejar un **mensaje** en un muro,
- subir **fotos y videos** del evento a un álbum común,
- **confirmar asistencia** (su nombre y cuántos van),
- grabar un **video de felicitación** ("brindis").

**Datos personales que se manejan:** nombre, mensajes, y **fotos/videos con
imágenes de personas** (los invitados y quienes aparezcan en sus fotos).

**Datos que NO se manejan:** ninguno financiero, de salud, ni de categorías
sensibles. No se pide fecha de nacimiento, dirección, ni identificación.

**Dónde se guardan:** en un proveedor de nube (Supabase) cuyos servidores están
en **Canadá** (transferencia internacional de datos).

**Quién opera cada evento:** el salón, que entrega los enlaces a sus clientes.
El contenido de cada evento está aislado del de los demás.

---

## 2. La decisión de fondo que necesito validar

Propongo este reparto de responsabilidad, y necesito confirmar que es correcto y
cómo dejarlo por escrito:

| Figura | Quién | Papel |
|---|---|---|
| **Responsable** de los datos | **El salón** (o los anfitriones) | Convoca a los invitados y decide qué se hace con las fotos. |
| **Encargado** | **Yo** (el proveedor de la herramienta) | Solo trato los datos por cuenta del salón, siguiendo sus instrucciones. |

La razón: es el salón quien tiene la relación con los invitados, no yo. Si el
aviso de privacidad me nombrara a mí como responsable, estaría asumiendo una
responsabilidad que le corresponde a mi cliente.

> **Lo primero que le pido al abogado:** redactar (o revisar) la **cláusula de
> "responsable / encargado"** para mi contrato con cada salón, que deje escrito
> este reparto y mis obligaciones y límites como encargado.

---

## 3. Preguntas concretas

1. ⚠️ **¿Cuál es la ley vigente hoy?** Los borradores se escribieron con la
   estructura de la **LFPDPPP** (Ley Federal de Protección de Datos Personales en
   Posesión de los Particulares) y su artículo 16. Tengo entendido que hubo una
   **reforma reciente** que cambió el marco y el organismo regulador (antes el
   INAI). Necesito saber **bajo qué ley y ante qué autoridad** estoy hoy, y qué
   cambia respecto a lo que tengo escrito.

2. **¿Es correcto el reparto responsable (salón) / encargado (yo)?** Y si lo es,
   ¿cómo debe quedar la cláusula en el contrato salón–proveedor?

3. **La figura de consentimiento.** Hoy, antes de que un invitado suba algo, ve un
   aviso corto junto al botón de enviar (no una casilla obligatoria). Para estos
   datos (nombre, mensajes y fotos del propio evento), ¿basta ese consentimiento
   o hace falta uno **expreso** (casilla)?

4. **Menores.** En una boda hay niños, y las fotos pueden incluir menores. ¿Qué
   obligaciones especiales hay (consentimiento de padres/tutores) y cómo las
   cubro razonablemente en un evento social?

5. **Uso de imagen.** Además del álbum del propio evento, ¿puede el **salón** usar
   esas fotos para **promocionarse** (redes, publicidad)? Eso cambiaría el
   consentimiento de uso de imagen. Quiero saber qué se puede y cómo pedirlo.

6. **Transferencia internacional.** Los datos se guardan en Canadá. ¿Basta con
   declararlo en el aviso (como está) o hace falta alguna cláusula o mecanismo
   adicional?

7. **Conservación.** ¿Cuántos **días** puedo/debo guardar el contenido después del
   evento? Hoy el texto dice "un periodo razonable" — necesito poner un número.

8. **Registro de consentimiento.** Hoy no guardo constancia de quién vio el aviso
   ni cuándo. ¿Es defendible para este nivel de datos, o necesito registrarlo?

9. **Límites de mi responsabilidad** como proveedor/encargado: ¿cómo redactarlos
   para que aguanten?

10. **¿Tengo que registrarme** ante alguna autoridad o hacer algún trámite formal
    para operar esto legalmente?

---

## 4. Los documentos ya redactados (para revisar)

Ya existen tres borradores, escritos para describir con honestidad lo que el
sistema hace, con la estructura de la ley mexicana. **Se pueden ver publicados**
en el sitio (una vez rellenados los datos del salón); el abogado debe revisarlos:

| Documento | Para quién | Qué cubre |
|---|---|---|
| **Aviso de privacidad** | Los invitados | Art. 16 LFPDPPP: identidad y domicilio del responsable, finalidades, cómo limitar el uso, cómo ejercer los derechos **ARCO** (acceso, rectificación, cancelación, oposición), transferencias, y cómo se avisan los cambios. |
| **Términos y condiciones** | El salón (cliente) | Las reglas del servicio entre el proveedor y el salón. |
| **Consentimiento de uso de imagen** | Los invitados | El permiso para las fotos/videos donde aparecen personas. |

*(Nota técnica para quien tenga acceso al proyecto: viven en
`packages/legal/src/index.ts` y se publican en `/legal/privacidad`,
`/legal/terminos`, `/legal/imagen`.)*

---

## 5. Lo que yo aporto de cada salón cliente

El aviso se rellena con los datos del salón (el responsable). De cada cliente
necesito reunir:

- **Nombre fiscal o comercial** del salón.
- **Domicilio** del salón (lo exige la ley).
- **Correo de contacto** donde el salón atiende las peticiones de los invitados
  (los derechos ARCO).

---

## 6. Resumen de lo que busco de esta consulta

- [ ] La **cláusula de responsable/encargado** para mi contrato con los salones.
- [ ] Confirmación (o corrección) de los **tres documentos** bajo la ley vigente.
- [ ] Respuesta a las **10 preguntas** de arriba, en especial: ley vigente,
      menores, uso de imagen para promoción, y días de conservación.
- [ ] Saber si necesito algún **trámite o registro** formal.

> Esto **no** sustituye la asesoría del abogado; es el material para que su
> tiempo cunda. Los textos son borradores hasta que él los valide.
