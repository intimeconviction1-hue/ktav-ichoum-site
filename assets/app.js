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

  // ---- Formulaires newsletter (démo) ----
  document.querySelectorAll("form.nlform").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var i = f.querySelector("input");
      if (i && i.value) { i.value = ""; i.placeholder = "✓ Inscription enregistrée (démo)"; }
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
