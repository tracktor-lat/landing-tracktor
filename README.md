# Tracktor — Landing

Landing estática de [www.tracktor.lat](https://www.tracktor.lat). Sin build ni
runtime: Vercel la despliega sola en cada push a `main`.

## Estructura

- `index.html` — la historia de venta: diésel caro que se pierde → cómo Tracktor
  lo detecta → precio → descarga → preguntas → demo.
- `styles.css` — sistema visual heredado de la app y el Dashboard (paleta,
  Montserrat/Inter, cards blancas, degradado azul marino). Sin íconos.
- `app.js` — modal "Solicitar demo", calculadora de precio, nav móvil y analítica.
- `apps-script.gs` — Web App de Google que recibe leads y eventos en un Sheet.
- `pages.css` — estilos propios de las páginas secundarias. Se carga **después**
  de `styles.css`, del que toma tokens, nav, botones, footer y vidrio.
- Páginas secundarias (misma nav, footer y estética que la home):
  - `privacidad`, `terminos`, `eliminar-cuenta` — legales, con índice lateral.
    La app, App Store y Play enlazan estas URLs con `.html`: no renombrarlas.
  - `soporte` — canales de contacto y temas frecuentes.
  - `subscription-checkout-success` — vuelta del checkout de Polar. Verifica el
    token contra la API y manda a la app (`rcm://`) o al Dashboard.
  - `404.html` — Vercel la sirve sola ante cualquier ruta inexistente. Usa
    rutas absolutas (`/assets/...`) porque puede mostrarse en cualquier path.
- `vercel.json` — alias sin `.html` (`/privacidad`, `/soporte`, …). Son
  rewrites, no redirecciones: las URLs con `.html` siguen respondiendo igual.
- `one-pager.html` — la hoja A4 que se reenvía por WhatsApp: primero el
  problema (cuánto diésel se pierde, a dónde se va, por qué no se ve), después
  la solución, el precio y un QR a la home (`utm_source=one-pager`). Mide
  exactamente 210 × 297 mm: si se le agrega contenido, verificar que no
  desborde. No usar degradados con transparencia ni `backdrop-filter`: el PDF
  de WebKit los dibuja negros. Por eso sus fotos están en `assets/one-pager/`
  con el degradado ya aplicado.
- PDF del one-pager (`Tracktor-One-Pager.pdf`, ignorado por git):
  - En cualquier Mac, sin descargar nada (WebKit):
    `swiftc -O generate-pdf.swift -o /tmp/exportar-pdf && /tmp/exportar-pdf "$PWD/one-pager.html" "$PWD/Tracktor-One-Pager.pdf"`
  - Con Chromium: `npx playwright install chromium` y `node generate-pdf.js`.
  - A mano: botón "Imprimir / Guardar PDF" de la página.

## Mensaje

El problema no es Excel ni WhatsApp: es que el combustible es hasta el 35% del
costo operativo y entre 5% y 15% se pierde por mala gestión. Tracktor ordena la
gestión de la flota con IA y avisa del desvío el mismo día. Textos en voseo,
"licencia de máquina", "online, pero funciona sin señal" (ver `docs/`).

## Precio

2 máquinas gratis; USD 5.99 por licencia/mes desde la 3ª. Los valores de la
calculadora (`FREE_MACHINES`, `SEAT_PRICE_USD` en `app.js`) deben coincidir con
el backend.

## Eventos (consola + Apps Script)

`page_view` (con `unique`), `scroll_depth` (25/50/75/100), `cta_click`,
`form_open`, `form_submit`, `form_validation_error`, `confirm_view`,
`store_click` (`ios` | `android`), `login_click`, `price_calc`,
`newsletter_submit`.

Los eventos viajan por `sendBeacon` como `text/plain` (con `application/json`
el navegador exige un preflight CORS que Apps Script no responde).

### Hojas que genera el Apps Script

- **Visitantes** — un registro por visita, aunque no dejen el formulario.
- **Leads** — solicitudes de demo.
- **Eventos** — funnel.
- **Resumen** — visitas, únicos, leads y % de conversión.

Tras editar `apps-script.gs` hay que pegarlo en Apps Script y re-desplegar la
Web App (Implementar → Administrar implementaciones → editar → Nueva versión).

## Probar localmente

```bash
python3 -m http.server 4173
```
