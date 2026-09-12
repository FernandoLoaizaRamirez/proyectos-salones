/**
 * El cartel de "esto es un documento de MUESTRA".
 *
 * Sale cuando la página no sabe de qué salón hablar: alguien llegó a /legal sin
 * el código de un evento (típicamente un prospecto que viene del catálogo), o
 * la consulta al servidor no salió. El documento que está leyendo es correcto,
 * pero es impersonal: dice "tu salón anfitrión" donde iría un nombre.
 *
 * POR QUÉ ES UN ARCHIVO APARTE Y NO UN MODO MÁS DE `aviso-pendiente.tsx`:
 * `tests/paneles/legal-publicado.test.ts` LEE ese archivo y lo parte por la
 * cadena literal «      ) : (» (seis espacios exactos) para aislar la rama que
 * ve el público. Meterle una tercera rama movería esa indentación y pondría la
 * prueba en rojo sin que nadie supiera por qué.
 *
 * ⚠️ AQUÍ NO VA EL AVISO_BORRADOR, y la razón es de tiempos: este cartel sale
 * SIEMPRE que no hay código de evento, y hay una ventana (entre el despliegue
 * del catálogo y el de las apps) en la que NINGÚN enlace lleva código. Durante
 * esa ventana, poner aquí «todavía no lo ha revisado un abogado» se lo estaría
 * diciendo a cada invitado de cada boda real — justo lo contrario de lo que
 * decide este diseño. El aviso de borrador lo ve quien PUBLICA: el salón, en su
 * panel, en la casilla obligatoria y en el apartado 10 de los términos.
 */
export function AvisoMuestra() {
  return (
    <div className="mt-6 rounded-[var(--radius)] border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
      <p className="font-medium">Documento de muestra</p>
      <p className="mt-1 text-muted-foreground">
        Así se ven los documentos legales de la suite. Cuando un salón contrata, aquí aparecen su
        nombre, su domicilio y su correo: cada salón es el responsable de los datos de sus
        invitados y publica los suyos desde el panel.
      </p>
    </div>
  );
}
