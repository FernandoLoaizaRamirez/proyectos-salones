# Arquitectura

## Los dos pilares

1. **Cada app funciona sola y completa.** Si un cliente compra una sola, esa app
   corre aislada, con sus propios datos, sin depender de nada más.
2. **Todas trabajan mejor juntas.** Cuando se activa la integración, comparten el
   mismo evento; si no, cada una usa sus datos locales. Nunca fallan por falta de
   otra app (**degradación elegante**).

## Piezas

### Cimientos (`packages/`)

| Paquete | Qué es | Estado |
| --- | --- | --- |
| `@salones/config` | Reglas comunes (TypeScript, formato). Garantiza que todo se escriba igual. | ✅ |
| `@salones/ui` | Sistema de diseño: colores, tipografía, botones, tema claro/oscuro, marca. | ✅ |
| `@salones/core` | Vocabulario común de datos (`Evento`, `Invitado`, `Mesa`…). | ✅ |
| `@salones/licensing` | Cobros, planes y licencias. | ⏳ reservado |
| `@salones/integrations` | Capa de integración opcional entre apps. | ⏳ reservado |
| `@salones/payments` | Stripe (suscripción, pago único, aportaciones). | ⏳ reservado |

### Apps (`apps/`)

| App | Qué es | Estado |
| --- | --- | --- |
| `album-fotos` | Álbum compartido de fotos. App de referencia y molde. | ✅ |
| _(las demás del catálogo)_ | | ⏳ por fases |

## Cómo se re-tematiza (white-label)

Toda la marca vive en dos lugares:

- **Colores, tipografía y redondeado:** `packages/ui/src/styles/tokens.css`.
- **Nombre y logo:** variables de entorno `NEXT_PUBLIC_BRAND_NAME` (y logo).

Cambiar eso recolorea y re-marca toda la suite sin tocar el código de las apps.
Ver `GUIA-WHITE-LABEL.md`.

## Decisión de arranque (importante)

La maquinaria comercial (cobros, licencias, multi-cliente) **se construye después**,
cuando haya una app funcionando que se vaya a vender. Por ahora se le deja su lugar
reservado en la estructura para que entre limpia, sin parches. Esto evita gastar
tiempo y dinero en infraestructura antes de tener el producto en el mostrador.
