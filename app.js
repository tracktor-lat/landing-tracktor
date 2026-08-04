/* ========================================================================
   RCM — Landing de validación (fake door test).
   Maneja el flujo form → pricing → confirmación e instrumenta TODOS los
   eventos del brief. No hay resultados pre-cargados ni planes destacados.
   ======================================================================== */
(function () {
  "use strict";

  /* --------------------------------------------------------------------
     CONFIG — Conecta aquí tu Google Sheet / Airtable / Formspree.
     Crea un Apps Script Web App (doPost) o un endpoint de Formspree y pega
     la URL. Si queda vacío, los datos solo se loguean en consola (modo test).
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

    // 3) Endpoint propio (Sheet/Airtable) vía beacon para no bloquear
    if (ANALYTICS_ENDPOINT) {
      try {
        navigator.sendBeacon(
          ANALYTICS_ENDPOINT,
          new Blob([JSON.stringify(data)], { type: "application/json" })
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
     MODAL + FLUJO
     -------------------------------------------------------------------- */
  var modal = document.getElementById("modal");
  var steps = {
    form: modal.querySelector('[data-step="form"]'),
    pricing: modal.querySelector('[data-step="pricing"]'),
    confirm: modal.querySelector('[data-step="confirm"]'),
  };
  var form = document.getElementById("leadForm");
  var leadData = null;

  function showStep(name) {
    Object.keys(steps).forEach(function (k) {
      steps[k].hidden = k !== name;
    });
  }

  function openModal(source) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    showStep("form");
    track("cta_click", { source: source });
    track("form_open", { source: source });
    var first = form.querySelector("input");
    if (first) setTimeout(function () { first.focus(); }, 80);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  /* ---- CTAs principales ---- */
  document.querySelectorAll("[data-cta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.getAttribute("data-cta"));
    });
  });

  /* ---- Cerrar modal ---- */
  modal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  /* --------------------------------------------------------------------
     PASO 1: Formulario de lead (4 campos)
     -------------------------------------------------------------------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var inputs = form.querySelectorAll("input");
    var valid = true;
    inputs.forEach(function (input) {
      var ok = input.checkValidity() && input.value.trim() !== "";
      input.classList.toggle("invalid", !ok);
      if (!ok && valid) input.focus();
      if (!ok) valid = false;
    });
    if (!valid) {
      track("form_validation_error");
      return;
    }

    leadData = {
      nombre: form.nombre.value.trim(),
      empresa: form.empresa.value.trim(),
      ubicacion: form.ubicacion.value.trim(),
      maquinarias: form.maquinarias.value.trim(),
      telefono: form.telefono.value.trim(),
    };

    track("form_submit", leadData);
    submitLead(leadData);

    renderSeatEstimate(leadData.maquinarias);
    showStep("pricing");
    track("pricing_view");
  });

  /* Máquinas incluidas sin costo y precio por máquina adicional.
     Deben coincidir con FREE_MACHINES / MACHINE_SEAT_PRICE_USD del backend. */
  var FREE_MACHINES = 2;
  var SEAT_PRICE_USD = 5.99;

  /* Traduce las máquinas declaradas en el paso 1 a lo que pagaría por mes, para
     que el precio deje de ser abstracto justo antes de elegir. */
  function renderSeatEstimate(maquinarias) {
    var target = modal.querySelector("[data-seat-estimate]");
    if (!target) return;

    var count = parseInt(maquinarias, 10);
    if (!isFinite(count) || count <= 0) return; // deja el copy por defecto

    var billable = Math.max(0, count - FREE_MACHINES);
    if (billable === 0) {
      target.textContent =
        "Con " + count + " máquina(s) entrás en el plan gratuito: USD 0 al mes.";
      return;
    }
    target.textContent =
      "Con " + count + " máquinas pagarías USD " +
      (billable * SEAT_PRICE_USD).toFixed(2) + " al mes (" +
      FREE_MACHINES + " gratis + " + billable + " a USD " + SEAT_PRICE_USD.toFixed(2) + ").";
  }

  function submitLead(data) {
    var record = Object.assign({ type: "lead", sid: sessionId, ts: new Date().toISOString() }, data);
    if (!FORM_ENDPOINT) {
      console.log("[RCM] (sin endpoint) lead capturado:", record);
      return;
    }
    fetch(FORM_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }).catch(function (err) {
      console.error("[RCM] error enviando lead", err);
    });
  }

  /* --------------------------------------------------------------------
     PASO 2: Test de pricing (sin plan destacado, sin resultado esperado)
     -------------------------------------------------------------------- */
  modal.querySelectorAll(".plan").forEach(function (plan) {
    plan.addEventListener("click", function () {
      var planId = plan.getAttribute("data-plan");
      track("plan_select", { plan: planId, lead: leadData });

      // Registrar elección junto al lead (no es checkout real — fase preventa)
      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.assign({ type: "plan_select", plan: planId, sid: sessionId, ts: new Date().toISOString() }, leadData || {})
          ),
        }).catch(function () {});
      }

      showStep("confirm");
      track("confirm_view", { plan: planId });
    });
  });

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
