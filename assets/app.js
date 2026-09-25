/* KTAV ICHOUM — interactions front (léger, sans dépendance) */
(function () {
  "use strict";

  // ---- Thème clair/sombre (sombre par défaut) ----
  var root = document.documentElement;
  function setTheme(t){ root.setAttribute("data-theme", t); var b=document.querySelectorAll("[data-theme-toggle]");
    b.forEach(function(x){ x.setAttribute("aria-pressed", t === "light"); }); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-theme-toggle]");
    if (t) { setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); }
  });

  // ---- Menu mobile ----
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-menu-open]"))  document.querySelector(".mobile-menu")?.classList.add("open");
    if (e.target.closest("[data-menu-close]")) document.querySelector(".mobile-menu")?.classList.remove("open");
  });

  // ---- Recherche (overlay simple) ----
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-search]")) {
      var q = window.prompt("Rechercher sur KTAV ICHOUM :");
      if (q) alert("Démo : recherche « " + q + " » — brancher sur l'index (Algolia / Meilisearch) en production.");
    }
  });

  // ---- Newsletter : confirmation uniquement après enregistrement par l'API ----
  document.querySelectorAll("form.nlform").forEach(function (f) {
    var input = f.querySelector('input[type="email"]');
    var button = f.querySelector('button[type="submit"]');
    if (!input || !button) return;
    input.name = 'email';
    input.autocomplete = 'email';
    f.method = 'post';
    f.action = '/api/subscribe';
    var label = document.createElement('label');
    label.className = 'nl-consent';
    label.innerHTML = '<input type="checkbox" name="consent" required> Je souhaite recevoir la lettre de Ktav Ichoum. <a href="/confidentialite">Confidentialité</a>';
    f.appendChild(label);
    var status = document.createElement('p');
    status.className = 'nl-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    f.appendChild(status);
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      if (!f.reportValidity()) return;
      button.disabled = true;
      status.textContent = 'Inscription en cours…';
      try {
        var response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value, consent: label.querySelector('input').checked }),
        });
        var result = await response.json();
        status.textContent = result.message || 'Inscription indisponible pour le moment.';
        if (response.ok && result.ok) f.reset();
      } catch (e) {
        status.textContent = 'Connexion impossible. Votre adresse n’a pas été enregistrée.';
      } finally {
        button.disabled = false;
      }
    });
  });

  // ---- Année dynamique footer ----
  document.querySelectorAll("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

  // ---- Barre de progression de lecture (article) ----
  var bar = document.querySelector("[data-reading-bar]");
  if (bar) {
    window.addEventListener("scroll", function () {
      var h = document.documentElement, sc = h.scrollTop, max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (sc / max) * 100 : 0) + "%";
    }, { passive: true });
  }
})();

/* ============================================================
   DATE DU JOUR — remplit automatiquement la barre du haut et
   la ligne « Édition du… ». Les dates d'articles ne bougent pas.
   ============================================================ */
(function () {
  var jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  var mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var d = new Date();
  var jour = d.getDate();
  var full = jours[d.getDay()] + ' ' + (jour === 1 ? '1er' : jour) + ' ' + mois[d.getMonth()] + ' ' + d.getFullYear();
  var cap = full.charAt(0).toUpperCase() + full.slice(1);
  document.querySelectorAll('.today').forEach(function (e) { e.textContent = cap; });
  document.querySelectorAll('.today-lc').forEach(function (e) { e.textContent = full; });
})();
