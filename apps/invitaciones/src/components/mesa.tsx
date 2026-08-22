"use client";

/**
 * "TU LUGAR" — la invitación le dice al invitado en qué mesa va a sentarse.
 *
 * El acomodo NO se captura aquí: lo arma el organizador en la app de mesas y
 * vive en las colecciones `mesas`/`acomodo` del evento. Esta sección solo LEE,
 * con los moldes tolerantes de @salones/core (una fila colada o rota se
 * descarta, no tumba la pantalla). Es una sola lectura al montar, sin
 * suscripción: el acomodo no cambia mientras el invitado tiene la invitación
 * abierta, y sondear gastaría los datos de su teléfono para nada.
 *
 * Regla de la casa: sin acomodo publicado, la sección entera devuelve `null`
 * — sin datos, sin sección, sin huecos.
 *
 * Si el invitado llegó con su enlace personal, se le busca solo y se le dice
 * directo dónde va; el buscador queda siempre a la mano para acompañantes o
 * por si su nombre en el enlace no coincide letra a letra con el del acomodo.
 */
import * as React from "react";
import {
  COLECCION_ACOMODO,
  COLECCION_MESAS,
  buscarEnAcomodo,
  companerosDe,
  mesaDe,
  normalizarAcomodoCrudo,
  normalizarMesasCrudas,
  normalizarNombre,
  type InvitadoEnlace,
  type InvitadoMesa,
  type MesaEvento,
} from "@salones/core";
import { obtenerSync, esVitrina } from "@salones/sync";
import { Rincon } from "./botanica";

/*
 * La semilla de la MUESTRA: la misma historia demo del resto de la suite
 * (copiada de `mesasIniciales`/`invitadosIniciales` de apps/mesas), para que
 * el catálogo cuente una sola boda de ejemplo de punta a punta. El prospecto
 * tiene que VER el buscador funcionando, no imaginárselo.
 */
const MESAS_MUESTRA: MesaEvento[] = [
  { id: "M-PRIN", nombre: "Mesa principal", capacidad: 10 },
  { id: "M-NOVIA", nombre: "Familia de la novia", capacidad: 10 },
  { id: "M-NOVIO", nombre: "Familia del novio", capacidad: 10 },
  { id: "M-AMIG", nombre: "Amigos", capacidad: 8 },
  { id: "M-TRAB", nombre: "Compañeros de trabajo", capacidad: 8 },
];

const ACOMODO_MUESTRA: InvitadoMesa[] = [
  { id: "G-A001", nombre: "Ana Herrera", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A002", nombre: "Rodrigo Salazar", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A003", nombre: "Sofía Herrera (dama)", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-A004", nombre: "Diego Salazar (padrino)", asientos: 1, mesaId: "M-PRIN" },
  { id: "G-B001", nombre: "Familia Herrera Medina", asientos: 4, mesaId: "M-NOVIA" },
  { id: "G-B002", nombre: "Tía Lucía y Tío Marco", asientos: 2, mesaId: "M-NOVIA" },
  { id: "G-B003", nombre: "Abuela Carmen", asientos: 1, mesaId: "M-NOVIA" },
  { id: "G-C001", nombre: "Familia Salazar Ruiz", asientos: 4, mesaId: "M-NOVIO" },
  { id: "G-C002", nombre: "Regina y José", asientos: 2, mesaId: "M-NOVIO" },
  { id: "G-D001", nombre: "Valentina Montes", asientos: 1, mesaId: "M-AMIG" },
  { id: "G-D002", nombre: "Carlos y Diana Pérez", asientos: 2, mesaId: "M-AMIG" },
  { id: "G-D003", nombre: "Grupo Alvarado", asientos: 3, mesaId: "M-AMIG" },
  { id: "G-Z001", nombre: "Miguel Ángel Torres", asientos: 1, mesaId: null },
  { id: "G-Z002", nombre: "Familia Loaiza Ramírez", asientos: 4, mesaId: null },
  { id: "G-Z003", nombre: "Paola y Andrés", asientos: 2, mesaId: null },
  { id: "G-Z004", nombre: "Fernanda Ríos", asientos: 1, mesaId: null },
];

type Datos = { mesas: MesaEvento[]; invitados: InvitadoMesa[] };

/** "Fulano, Zutano y Mengano" — la lista como se diría en voz alta. */
function nombresEnLista(gente: InvitadoMesa[]): string {
  const nombres = gente.map((g) => g.nombre);
  // El `?? ""` no sobra aunque acabemos de comprobar el largo: TypeScript no
  // ata las dos cosas y da `string | undefined` al sacar de una lista.
  if (nombres.length === 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

export function TuMesa({
  codigo,
  invitado,
  onAparece,
}: {
  codigo: string;
  invitado: InvitadoEnlace | null;
  /** Avisa a la página que la sección ya está en el árbol (ver useRevelados). */
  onAparece?: () => void;
}) {
  const esMuestra = esVitrina(codigo);
  // En la muestra los datos son locales y existen desde el primer pintado; en
  // un evento real empiezan vacíos y llegan (o no) con la lectura de abajo.
  const [datos, setDatos] = React.useState<Datos | null>(() =>
    esMuestra ? { mesas: MESAS_MUESTRA, invitados: ACOMODO_MUESTRA } : null,
  );
  const [busqueda, setBusqueda] = React.useState("");
  const [elegido, setElegido] = React.useState<InvitadoMesa | null>(null);

  React.useEffect(() => {
    if (esMuestra) return;
    let vivo = true;
    (async () => {
      try {
        const sync = obtenerSync();
        // Las dos colecciones a la vez: son chicas y la sección no puede
        // pintarse con una sola (una mesa sin invitados no dice nada).
        const [mesasCrudas, acomodoCrudo] = await Promise.all([
          sync.listar(codigo, COLECCION_MESAS),
          sync.listar(codigo, COLECCION_ACOMODO),
        ]);
        if (!vivo) return;
        const mesas = normalizarMesasCrudas(mesasCrudas);
        const invitados = normalizarAcomodoCrudo(acomodoCrudo);
        // "Publicado" = hay mesas Y hay invitados. Con la mitad capturada la
        // sección le diría "no te encontramos" a todo el mundo.
        if (mesas.length && invitados.length) setDatos({ mesas, invitados });
      } catch {
        /* sin red o sin servidor: la invitación sigue completa sin esta sección */
      }
    })();
    return () => {
      vivo = false;
    };
  }, [codigo, esMuestra]);

  // La sección aparece DESPUÉS del primer pintado (espera su lectura), así que
  // le avisa a la página para que el revelado vuelva a pasar por ella.
  const visible = datos !== null;
  React.useEffect(() => {
    if (visible) onAparece?.();
  }, [visible, onAparece]);

  /*
   * La coincidencia directa del enlace personal: solo si es inequívoca. Con
   * una sola coincidencia por subcadena, es él; con varias, únicamente si una
   * es EXACTA (sin acentos ni mayúsculas). En la duda no se afirma nada y el
   * invitado se busca solo — decirle una mesa equivocada es peor que callar.
   */
  const directo = React.useMemo(() => {
    if (!datos || !invitado) return null;
    const candidatos = buscarEnAcomodo(invitado.nombre, datos.invitados);
    if (candidatos.length === 1) return candidatos[0];
    const exactos = candidatos.filter(
      (c) => normalizarNombre(c.nombre) === normalizarNombre(invitado.nombre),
    );
    return exactos.length === 1 ? exactos[0] : null;
  }, [datos, invitado]);

  if (!datos) return null;

  const resultados = buscarEnAcomodo(busqueda, datos.invitados);
  // Lo que se eligió en el buscador manda sobre la coincidencia automática:
  // el invitado puede estar buscándole el lugar a su acompañante.
  const enfoque = elegido ?? directo;
  const mesa = enfoque ? mesaDe(enfoque, datos.mesas) : null;
  const companeros = enfoque && mesa ? companerosDe(enfoque, datos.invitados) : [];

  return (
    <section id="mesa" className="compacta">
      <Rincon donde="ii" />
      <div className="env centro">
        <p className="eyebrow rev">Dónde me siento</p>
        <h2 className="titulo rev">Tu lugar</h2>

        {/* La ficha va SIN `rev`: puede aparecer por un clic en el buscador,
            mucho después del pase de revelado, y con `rev` quedaría invisible. */}
        {enfoque ? (
          <div className="ficha">
            <p className="rol">{enfoque.nombre}</p>
            {mesa ? (
              <>
                <p className="nom">Te toca: {mesa.nombre}</p>
                {companeros.length ? (
                  <p className="compas">La compartes con {nombresEnLista(companeros)}.</p>
                ) : null}
              </>
            ) : (
              // Está en la lista pero aún sin mesa: se dice la verdad, no una mesa.
              <p className="nom">Tu lugar está por asignarse</p>
            )}
          </div>
        ) : (
          <p className="texto rev d1">Busca tu nombre y te decimos en qué mesa te sentamos.</p>
        )}

        <div className="campo rev d1">
          <label htmlFor="mesaBusca">{enfoque ? "¿Buscas a alguien más?" : "Busca tu nombre"}</label>
          <input
            id="mesaBusca"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Tu nombre o el de tu familia"
            autoComplete="off"
          />
        </div>

        {busqueda.trim() ? (
          resultados.length ? (
            <ul className="resultados">
              {resultados.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-pressed={enfoque?.id === r.id}
                    onClick={() => setElegido(r)}
                  >
                    {r.nombre}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="texto">
              No encontramos ese nombre. Pregunta en la entrada del salón, con gusto te ayudan.
            </p>
          )
        ) : null}
      </div>
    </section>
  );
}
