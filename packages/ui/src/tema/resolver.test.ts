import { describe, expect, it } from "vitest";
import { esColorSeguro, resolverTema } from "./resolver";

describe("esColorSeguro (el cinturón contra inyección en inline style)", () => {
  it("acepta los formatos de la casa", () => {
    for (const c of [
      "#7a2e3b",
      "#fff",
      "#ffffff80",
      "rgb(255, 0, 0)",
      "rgb(255 0 0 / 0.5)",
      "hsl(0 0% 100%)",
      "oklch(0.45 0.11 15)",
      "oklab(0.5 0.1 -0.05)",
      "  #c9a96e  ", // con espacios de sobra: se recortan, no se rechazan
    ]) {
      expect(esColorSeguro(c), c).toBe(true);
    }
  });

  it("rechaza cualquier cosa con la que se pueda escapar o traer datos", () => {
    for (const c of [
      "red; background: url(https://mal.example)",
      "var(--primary)",
      "url(https://mal.example)",
      "oklch(0.5 0.1 15); }",
      "calc(1px + 1px)",
      "oklch(var(--x) 0 0)",
      "#7a2e3b}",
      "javascript:alert(1)",
      "red", // los nombres de color no entran: la lista sería infinita y opaca
      "",
      "   ",
      "#".padEnd(80, "f"), // demasiado largo
    ]) {
      expect(esColorSeguro(c), c).toBe(false);
    }
  });

  it("rechaza lo que no es texto", () => {
    expect(esColorSeguro(null)).toBe(false);
    expect(esColorSeguro(undefined)).toBe(false);
    expect(esColorSeguro(42)).toBe(false);
  });

  it("rechaza hex de longitud inválida (el typo de 5 dígitos)", () => {
    // "#fbf9f" pasaba con {3,8}, es CSS inválido, y una variable con basura
    // NO hereda el tema base: envenena todas las derivadas de superficie.
    for (const c of ["#fbf9f", "#fbf9f5a", "#ff", "#fbf9f5abc"]) {
      expect(esColorSeguro(c), c).toBe(false);
    }
  });
});

describe("resolverTema (la fusión salón + evento)", () => {
  const salon = {
    nombre: "Hacienda Santa Renata",
    sitioUrl: "https://salones-teal.vercel.app",
    primario: "#7a2e3b",
    primarioTexto: "#fbf9f5",
    acento: "#c9a96e",
    fondo: "#fbf9f5",
    tinta: "#241d1a",
    radio: "0.4rem",
    fuentes: "clasica" as const,
  };

  it("sin evento, el tema es el del salón", () => {
    const tema = resolverTema(salon);
    expect(tema.colores.primario).toBe("#7a2e3b");
    expect(tema.colores.acento).toBe("#c9a96e");
    expect(tema.colores.fondo).toBe("#fbf9f5");
    expect(tema.radio).toBe("0.4rem");
    expect(tema.fuentes).toBe("clasica");
    expect(tema.esquema).toBe("claro");
    expect(tema.salon.sitioUrl).toBe("https://salones-teal.vercel.app");
  });

  it("el evento pisa SOLO lo suyo: color y fuentes, no la superficie ni el radio", () => {
    const tema = resolverTema(salon, {
      primario: "#1d4ed8",
      fuentes: "moderna",
      monograma: "A·R",
      frase: "Una noche para recordar",
    });
    expect(tema.colores.primario).toBe("#1d4ed8"); // del evento
    expect(tema.colores.acento).toBe("#c9a96e"); // heredado del salón
    expect(tema.colores.fondo).toBe("#fbf9f5"); // la superficie es del salón
    expect(tema.radio).toBe("0.4rem"); // el radio es del salón
    expect(tema.fuentes).toBe("moderna"); // las fuentes sí las pisa
    expect(tema.evento?.monograma).toBe("A·R");
    expect(tema.evento?.frase).toBe("Una noche para recordar");
  });

  it("un color inválido se DESCARTA y hereda (no se cuela al style)", () => {
    const tema = resolverTema(salon, { primario: "url(https://mal.example)" });
    expect(tema.colores.primario).toBe("#7a2e3b"); // heredó el del salón
  });

  it("si el primarioTexto del evento pisa al primario, se re-deriva", () => {
    // El salón capturó texto para SU vino; el evento trae un primario claro.
    // El texto del salón (#fbf9f5, crema) sería ilegible sobre el amarillo.
    const tema = resolverTema(
      { nombre: "X", primario: "#7a2e3b" }, // sin primarioTexto capturado
      { primario: "#facc15" },
    );
    expect(tema.colores.primario).toBe("#facc15");
    expect(tema.colores.primarioTexto).toBe("#000000"); // derivado, legible
  });

  it("la pareja fondo/tinta ilegible se descarta ENTERA", () => {
    const tema = resolverTema({ nombre: "X", fondo: "#eeeeee", tinta: "#dddddd" });
    expect(tema.colores.fondo).toBeUndefined();
    expect(tema.colores.tinta).toBeUndefined();
  });

  it("una pareja INVERIFICABLE (ratio nulo) también se descarta", () => {
    // oklch con "none" pasa el regex de seguridad pero no se puede medir:
    // nueve variables derivadas no se cuelgan de un color inverificable.
    const tema = resolverTema({ nombre: "X", fondo: "oklch(0.5 0.1 none)", tinta: "#241d1a" });
    expect(tema.colores.fondo).toBeUndefined();
    expect(tema.colores.tinta).toBeUndefined();
  });

  it("el texto huérfano se descarta con su primario", () => {
    // El texto estaba pensado para un primario que resultó inválido: dejarlo
    // pintaría crema sobre el rosa del tema base (≈2.3:1).
    const tema = resolverTema({ nombre: "X", primario: "vino", primarioTexto: "#fbf9f5" });
    expect(tema.colores.primario).toBeUndefined();
    expect(tema.colores.primarioTexto).toBeUndefined();
  });

  it("las URLs solo pasan si son http(s) — nada de javascript:", () => {
    const tema = resolverTema(
      {
        nombre: "X",
        sitioUrl: "javascript:alert(document.cookie)",
        logoUrl: "data:text/html,<script>1</script>",
      },
      { portadaUrl: "javascript:void(0)" },
    );
    expect(tema.salon.sitioUrl).toBeUndefined();
    expect(tema.salon.logoUrl).toBeUndefined();
    expect(tema.evento?.portadaUrl).toBeUndefined();

    const buena = resolverTema({ nombre: "X", sitioUrl: "https://salones-teal.vercel.app" });
    expect(buena.salon.sitioUrl).toBe("https://salones-teal.vercel.app");
  });

  it("media pareja de superficie no sirve: se descarta", () => {
    const tema = resolverTema({ nombre: "X", fondo: "#ffffff" });
    expect(tema.colores.fondo).toBeUndefined();
  });

  it("un radio raro se descarta (solo medidas simples)", () => {
    expect(resolverTema({ nombre: "X", radio: "0.4rem; position: fixed" }).radio).toBeUndefined();
    expect(resolverTema({ nombre: "X", radio: "1rem" }).radio).toBe("1rem");
  });

  it("una clave de fuentes desconocida cae a sistema", () => {
    const tema = resolverTema({ nombre: "X", fuentes: "comic-sans" as never });
    expect(tema.fuentes).toBe("sistema");
  });

  it("el origen y los datos del evento viajan en el tema", () => {
    const tema = resolverTema(salon, null, {
      origen: "demo",
      datosEvento: { nombre: "Boda Ana & Rodrigo", fechaISO: "2027-03-20" },
    });
    expect(tema.origen).toBe("demo");
    expect(tema.evento?.nombre).toBe("Boda Ana & Rodrigo");
    expect(tema.evento?.fechaISO).toBe("2027-03-20");
  });
});
