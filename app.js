/* ========================================================================
   Tracktor — Landing.
   CTA de demo por WhatsApp, calculadora de precio,
   navegación móvil y la analítica que alimenta el Apps Script.
   ======================================================================== */
(function () {
  "use strict";

  /* --------------------------------------------------------------------
     CONFIG — Apps Script que recibe el newsletter y la analítica.
     -------------------------------------------------------------------- */
  var FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbzV-RgTr1cyMF-rPAwjKtIfCgi8OrV_Nj2yFDBskPg9JBcWVw2ulRMGV8B1Paw2hIer/exec";
  var ANALYTICS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzV-RgTr1cyMF-rPAwjKtIfCgi8OrV_Nj2yFDBskPg9JBcWVw2ulRMGV8B1Paw2hIer/exec";

  /* --------------------------------------------------------------------
     ANALÍTICA
     -------------------------------------------------------------------- */
  var sessionId = (function () {
    var k = "rcm_sid";
    var v = sessionStorage.getItem(k);
    if (!v) {
      v = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem(k, v);
    }
    return v;
  })();

  function track(event, payload) {
    var data = Object.assign(
      {
        event: event,
        ts: new Date().toISOString(),
        sid: sessionId,
        path: location.pathname,
      },
      payload || {}
    );

    // 1) Consola (siempre visible para depurar el experimento)
    console.log("[RCM analytics]", event, data);

    // 2) dataLayer / gtag si existen (GA4, GTM)
    if (window.dataLayer) window.dataLayer.push(data);
    if (typeof window.gtag === "function") window.gtag("event", event, data);

    // 3) Endpoint propio (Sheet/Airtable) vía beacon para no bloquear.
    //    text/plain y no application/json: este último dispara un preflight
    //    CORS que Apps Script no responde y el navegador descarta el beacon.
    //    El script igual lo parsea con JSON.parse(e.postData.contents).
    if (ANALYTICS_ENDPOINT) {
      try {
        navigator.sendBeacon(
          ANALYTICS_ENDPOINT,
          new Blob([JSON.stringify(data)], { type: "text/plain;charset=UTF-8" })
        );
      } catch (e) {
        /* noop */
      }
    }
  }

  /* ---- Datos del visitante (se guardan aunque no deje el formulario) ---- */
  function getParam(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (e) {
      return "";
    }
  }

  function collectVisitor() {
    return {
      referrer: document.referrer || null,
      utm_source: getParam("utm_source"),
      utm_medium: getParam("utm_medium"),
      utm_campaign: getParam("utm_campaign"),
      userAgent: navigator.userAgent || "",
      language: navigator.language || "",
      screen: window.screen ? window.screen.width + "x" + window.screen.height : "",
      viewport: window.innerWidth + "x" + window.innerHeight,
    };
  }

  /* ---- Page view único (por navegador, persistente) ---- */
  (function pageView() {
    var firstTime = !localStorage.getItem("rcm_seen");
    if (firstTime) localStorage.setItem("rcm_seen", "1");
    track("page_view", Object.assign({ unique: firstTime }, collectVisitor()));
  })();

  /* ---- Scroll depth (25 / 50 / 75 / 100) ---- */
  (function scrollDepth() {
    var marks = [25, 50, 75, 100];
    var fired = {};
    function onScroll() {
      var doc = document.documentElement;
      var scrolled =
        (doc.scrollTop + window.innerHeight) /
        (doc.scrollHeight || 1) *
        100;
      marks.forEach(function (m) {
        if (!fired[m] && scrolled >= m) {
          fired[m] = true;
          track("scroll_depth", { depth: m });
        }
      });
      if (fired[100]) window.removeEventListener("scroll", onScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  })();

  /* --------------------------------------------------------------------
     NAV MÓVIL — panel desplegable de enlaces de sección.
     -------------------------------------------------------------------- */
  (function mobileNav() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    function setOpen(open) {
      links.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Al elegir una sección el panel se cierra solo.
    links.addEventListener("click", function (e) {
      if (e.target.closest(".nav__link")) setOpen(false);
    });

    // Tocar fuera del nav lo cierra.
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav__inner")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });

    // Al volver a desktop el panel no debe quedar en estado "abierto".
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  })();

  /* --------------------------------------------------------------------
     SOLICITAR DEMO: abre WhatsApp con un mensaje ya escrito.
     -------------------------------------------------------------------- */
  var WHATSAPP_URL = "https://wa.me/59176001957?text=" +
    encodeURIComponent("Hola, quiero una demo de Tracktor. Tengo __ máquinas en __.");

  document.querySelectorAll("[data-cta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      track("cta_click", { source: btn.getAttribute("data-cta"), channel: "whatsapp" });
      window.open(WHATSAPP_URL, "_blank", "noopener");
    });
  });

  /* ---- Tiendas (App Store y Google Play) e ingreso al Dashboard ----
     Son enlaces externos: no abren WhatsApp, solo dejan el evento. */
  document.querySelectorAll("[data-store]").forEach(function (link) {
    link.addEventListener("click", function () {
      track("store_click", { store: link.getAttribute("data-store") });
    });
  });
  document.querySelectorAll("[data-login]").forEach(function (link) {
    link.addEventListener("click", function () {
      track("login_click", { source: link.getAttribute("data-login") });
    });
  });

  /* --------------------------------------------------------------------
     CALCULADORA DE PRECIO
     Deben coincidir con FREE_MACHINES / MACHINE_SEAT_PRICE_USD del backend.
     -------------------------------------------------------------------- */
  (function priceCalc() {
    var FREE_MACHINES = 2;
    var SEAT_PRICE_USD = 5.99;
    var input = document.getElementById("calcInput");
    var result = document.getElementById("calcResult");
    if (!input || !result) return;

    function render() {
      var count = parseInt(input.value, 10);
      if (!isFinite(count) || count < 1) {
        result.textContent = "";
        return;
      }
      var billable = Math.max(0, count - FREE_MACHINES);
      if (billable === 0) {
        result.innerHTML = "<strong>USD 0 al mes</strong>Tus " +
          (count === 1 ? "máquina entra" : count + " máquinas entran") + " en el plan gratis.";
        return;
      }
      result.innerHTML = "<strong>USD " + (billable * SEAT_PRICE_USD).toFixed(2) + " al mes</strong>" +
        FREE_MACHINES + " gratis + " + billable + (billable === 1 ? " licencia" : " licencias") +
        " de USD " + SEAT_PRICE_USD.toFixed(2) + ".";
    }

    document.querySelectorAll("[data-calc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = (parseInt(input.value, 10) || 0) + parseInt(btn.getAttribute("data-calc"), 10);
        input.value = Math.min(500, Math.max(1, next));
        render();
      });
    });
    input.addEventListener("input", render);
    // Un solo evento por visita: alcanza para saber si la calculadora se usa.
    input.addEventListener("change", function () {
      track("price_calc", { machines: input.value });
    });
    render();
  })();

  /* --------------------------------------------------------------------
     NEWSLETTER (footer) — solo analítica, no dispara la preventa.
     -------------------------------------------------------------------- */
  var newsletterForm = document.getElementById("newsletterForm");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = newsletterForm.email.value.trim();
      if (!email) return;
      track("newsletter_submit", { email: email });
      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "newsletter", email: email, sid: sessionId, ts: new Date().toISOString() }),
        }).catch(function () {});
      }
      newsletterForm.reset();
      var btn = newsletterForm.querySelector("button");
      if (btn) {
        var original = btn.textContent;
        btn.textContent = "✓";
        setTimeout(function () { btn.textContent = original; }, 1800);
      }
    });
  }
})();
