/**
 * Single-flight por código de evento, con REINTENTO tras fallo.
 *
 * Una promesa por código, compartida entre todos los componentes que
 * pregunten lo mismo (el Map lo aporta cada hook). La diferencia con el molde
 * original del photobooth: el FALLO no se queda — si la consulta devuelve
 * null (red caída, servidor ausente) o lanza, la entrada del Map se borra y
 * el siguiente montaje reintenta. Sin esto, el invitado que abría la app en
 * la zona muerta del salón se quedaba sin marca toda la noche aunque la red
 * volviera. (Puro y sin React a propósito: se prueba con vitest a secas.)
 */
export function consultaUnica<T>(
  mapa: Map<string, Promise<T | null>>,
  codigo: string,
  consultar: () => Promise<T | null>,
): Promise<T | null> {
  let p = mapa.get(codigo);
  if (!p) {
    p = consultar()
      .then((dato) => {
        if (dato === null) mapa.delete(codigo);
        return dato;
      })
      .catch(() => {
        mapa.delete(codigo);
        return null;
      });
    mapa.set(codigo, p);
  }
  return p;
}
