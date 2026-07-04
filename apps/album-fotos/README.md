# Álbum de Fotos

App de referencia de la suite **Proyectos Salones**. Los invitados suben fotos y
videos del evento y todos los disfrutan y descargan en un solo lugar.

Sirve además de **molde**: las demás apps se construyen copiando sus patrones
(sistema de diseño, tema claro/oscuro, white-label, modo aislado vs. integrado).

## Qué hace hoy

- Subida de fotos/videos y galería en vivo (modo aislado: los archivos se quedan
  en el dispositivo, sin necesitar servidor todavía).
- Tema claro/oscuro y marca configurable (white-label).
- Detecta si hay un evento compartido y se adapta, sin fallar nunca.

## Variables de entorno

Copia `.env.example` a `.env.local` y ajusta:

| Variable | Para qué sirve |
| --- | --- |
| `NEXT_PUBLIC_BRAND_NAME` | Nombre de la marca que se muestra en la app. |
| `NEXT_PUBLIC_SHARED_BACKEND_URL` | (Opcional) Activa el modo integrado con el evento compartido. |
| `APP_MODE` | Modo de venta (`OWNED` por ahora). Reservado para la etapa de licencias. |

## Correr en local

Desde la raíz del monorepo:

```bash
pnpm install
pnpm --filter album-fotos dev
```

Abre http://localhost:3000

## Desplegar

Compatible con Vercel. Cada app se despliega sola, sin necesitar el resto del
monorepo en producción.
