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

  // Recherche locale dans les articles publiés.
  var searchData;
  function normalize(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  var dialog=document.createElement("dialog");
  dialog.setAttribute("aria-labelledby","ki-search-title");
  dialog.style.cssText="width:min(680px,calc(100% - 32px));max-height:85vh;border:1px solid #aaa;border-radius:8px;padding:24px;background:#f8f5ee;color:#171412";
  dialog.innerHTML='<form method="dialog"><button style="float:right;padding:8px" aria-label="Fermer la recherche">Fermer ×</button></form><h2 id="ki-search-title" style="font:700 24px Archivo,sans-serif">Rechercher un article</h2><label for="ki-query">Nom, lieu ou affaire</label><input id="ki-query" type="search" style="display:block;width:100%;box-sizing:border-box;padding:12px;margin:12px 0;font:inherit" autocomplete="off"><p id="ki-search-status" role="status"></p><div id="ki-search-results"></div>';
  document.body.appendChild(dialog);
  var input=dialog.querySelector("input"), results=dialog.querySelector("#ki-search-results"), status=dialog.querySelector("#ki-search-status");
  function showResults(){
    if(!searchData)return;
    var words=normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    var found=words.length?searchData.filter(function(item){var hay=normalize(item.title+" "+item.description+" "+item.text);return words.every(function(w){return hay.includes(w);});}):searchData;
    results.replaceChildren();
    status.textContent=found.length+" article"+(found.length>1?"s":"")+(words.length?" trouvé"+(found.length>1?"s":""):" disponibles");
    found.forEach(function(item){
      var article=document.createElement("article"),link=document.createElement("a"),p=document.createElement("p");
      article.style.cssText="padding:14px 0;border-top:1px solid #ccc";
      link.href=item.url;link.textContent=item.title;link.style.cssText="color:#910812;font:700 17px Archivo,sans-serif";
      p.textContent=item.description;p.style.cssText="font:15px/1.5 Inter,sans-serif;margin:8px 0";
      article.append(link,p);results.appendChild(article);
    });
  }
  input.addEventListener("input",showResults);
  document.addEventListener("click",function(e){
    if(!e.target.closest("[data-search]"))return;
    dialog.showModal();input.focus();
    if(searchData){showResults();return;}
    status.textContent="Chargement des articles…";
    fetch("/assets/search-index.json?v=20261104").then(function(r){if(!r.ok)throw Error();return r.json();}).then(function(data){searchData=data;showResults();}).catch(function(){status.textContent="Recherche momentanément indisponible. Fermez puis réessayez.";});
  });
  // Ne jamais confirmer une inscription sans service de collecte.
  document.querySelectorAll("form.nlform").forEach(function(f){
    var note=document.createElement("p");note.setAttribute("role","status");
    note.textContent="Les inscriptions à la newsletter ne sont pas encore ouvertes.";
    var rss=document.createElement("a");rss.href="/api/rss";rss.textContent="Suivre le flux RSS";rss.style.cssText="color:inherit;text-decoration:underline";
    note.appendChild(document.createTextNode(" "));note.appendChild(rss);
    f.replaceWith(note);
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
  document.querySelectorAll('.today').forEach(function (e) { e.textContent = (e.closest(".edition") ? " · " : "") + cap; });
  document.querySelectorAll('.today-lc').forEach(function (e) { e.textContent = full; });
})();
