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
- Páginas sueltas: `privacidad`, `terminos`, `soporte`, `eliminar-cuenta`,
  `subscription-checkout-success` (retorno del checkout de Polar) y `one-pager`.

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
