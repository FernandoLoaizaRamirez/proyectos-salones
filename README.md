# Proyectos Salones

Suite modular de aplicaciones para salones de eventos (bodas, XV años, corporativos).

Cada aplicación **funciona por sí sola** y, cuando el cliente contrata varias,
**trabajan mejor juntas** sin depender unas de otras.

## Estructura

```
Proyectos-Salones/
├── apps/                # Aplicaciones (cada una se despliega sola)
│   └── album-fotos/     # App de referencia: álbum de fotos compartido
├── packages/            # Piezas compartidas (los "cimientos")
│   ├── config/          # Reglas comunes (TypeScript, formato)
│   ├── ui/              # Sistema de diseño (la cara de la familia)
│   └── core/            # Vocabulario común de datos (Evento, Invitado…)
└── docs/                # Documentación
```

## Cómo arrancar (en local)

```bash
pnpm install          # instala todo una sola vez
pnpm dev              # levanta las apps en modo desarrollo
```

La app de álbum abre en http://localhost:3000

## Estado actual

- ✅ Cimientos: reglas comunes, sistema de diseño, vocabulario de datos.
- ✅ App de referencia `album-fotos` funcionando en **modo aislado**.
- ⏳ Pendiente (a propósito, para más adelante): cobros, licencias y las demás apps.

Ver `docs/ARQUITECTURA.md` para el detalle.
