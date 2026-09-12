# RCM — Landing de validación (Fake Door Test)

Landing estática y liviana para validar mercado **antes** de seguir construyendo
producto. No es el lanzamiento ni una versión del app.

## Estructura

- `index.html` — copy y secciones del brief (hero, problema, CTA, modal de flujo).
- `styles.css` — sistema de diseño extraído del app Flutter (paleta, Montserrat/Inter, tarjetas redondeadas, degradado premium navy).
- `app.js` — flujo `form → pricing → confirmación` + instrumentación de analítica.

## Flujo

1. Visitante lee propuesta de valor, cómo funciona y problema.
2. CTA → formulario de 5 campos (Nombre, Empresa, Ubicación, N° de maquinarias, Teléfono).
3. Enviar → pantalla de pricing (3 planes: Free / Pro / Max, **ninguno destacado** para no sesgar la elección).
4. Elige plan → confirmación "estás en fase de piloto/preventa, te contactamos en 3 días". No hay checkout real.

## Eventos instrumentados (ver consola)

`page_view` (con `unique`), `scroll_depth` (25/50/75/100), `cta_click`,
`form_open`, `form_submit`, `form_validation_error`, `pricing_view`,
`plan_select` (con el id del plan), `confirm_view`,
`store_click` (con `store`: `ios` = App Store, `ios_testflight`, `android`).

Los eventos se loguean en consola y se envían a `dataLayer`/`gtag` si existen.

## Conectar la captura de datos

Abre `app.js` y completa estas constantes (no se necesita base de datos):

```js
var FORM_ENDPOINT = "";      // Google Apps Script (doPost) / Formspree / Airtable
var ANALYTICS_ENDPOINT = ""; // opcional: hoja aparte para eventos
```

Opción rápida: un **Google Apps Script** publicado como Web App que recibe el
POST y agrega una fila al Sheet. Los leads llegan con todos los campos para
filtrar manualmente el perfil calificado después.

### Hojas que genera el Apps Script (`apps-script.gs`)

- **Visitantes** — un registro por visita (page_view), aunque no dejen el
  formulario: `sid`, único, referrer, `utm_*`, userAgent, idioma, pantalla, viewport.
- **Leads** — formularios enviados y elección de plan (conversión).
- **Eventos** — funnel (scroll_depth, cta_click, form_open, etc.).
- **Resumen** — métricas en vivo: visitas, visitantes únicos, leads, selección
  de plan y **% de conversión** (visitantes → leads). Se actualiza en cada visita.

Además, abrir la **URL de la Web App** en el navegador (`doGet`) devuelve esas
métricas en JSON para un chequeo rápido.

> Tras editar `apps-script.gs` hay que **volver a pegarlo en Apps Script y
> re-desplegar** la Web App (Implementar → Administrar implementaciones → editar
> → Nueva versión) para que los cambios apliquen.

## Probar localmente

```bash
cd landing-rcm
python3 -m http.server 8080
# abrir http://localhost:8080
```
