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

/* ============================================================
   AGRÉGATEUR — consomme /api/feed et remplit :
   - [data-feed-theme="all"|"justice"|…]  (fil par rubrique)
   - [data-feed-il]  (presse israélienne en direct, hébreu)
   ============================================================ */
(function () {
  var targets = document.querySelectorAll('[data-feed-theme],[data-feed-il]');
  if (!targets.length) return;
  var THEME_LABEL = {'crime-organise':'Crime organisé','justice':'Justice','police':'Police','enquetes':'Enquêtes','societe':'Société','faits-divers':'Faits divers'};

  function rel(d){ if(!d) return ''; var t=new Date(d).getTime(); if(isNaN(t)) return ''; var s=Math.max(0,(Date.now()-t)/1000);
    if(s<3600) return Math.round(s/60)+' min'; if(s<86400) return Math.round(s/3600)+' h'; return Math.round(s/86400)+' j'; }
  function esc(x){ return (x||'').replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];}); }

  function renderFr(el, items){
    if(!items.length){ el.innerHTML='<div class="lw-empty">Aucune dépêche pour le moment.</div>'; return; }
    el.innerHTML = items.slice(0,12).map(function(it){
      var badge = it.theme && el.getAttribute('data-feed-theme')==='all'
        ? '<span class="lw-badge">'+esc(THEME_LABEL[it.theme]||'')+'</span>' : '';
      return '<div class="lw-item"><span class="tm">'+(rel(it.pubDate)||'·')+'</span>'+
        '<span><a href="'+esc(it.link)+'" target="_blank" rel="noopener">'+esc(it.title)+'</a>'+
        (it.source?'<span class="so">'+esc(it.source)+badge+'</span>':badge)+'</span></div>';
    }).join('');
  }
  function renderIl(el, items){
    if(!items.length){ el.innerHTML='<div class="lw-empty">Flux indisponible pour le moment.</div>'; return; }
    el.innerHTML = items.slice(0,10).map(function(it){
      return '<div class="lw-item lw-rtl"><span class="tm">'+(rel(it.pubDate)||'·')+'</span>'+
        '<span dir="rtl"><a href="'+esc(it.link)+'" target="_blank" rel="noopener">'+esc(it.title)+'</a>'+
        (it.source?'<span class="so">'+esc(it.source)+'</span>':'')+'</span></div>';
    }).join('');
  }

  var data=null, loading=false, waiters=[];
  function load(cb){
    if(data){ cb(data); return; }
    waiters.push(cb);
    if(loading) return; loading=true;
    fetch('/api/feed',{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      data=d; loading=false; waiters.forEach(function(f){f(d);}); waiters=[];
    }).catch(function(){ loading=false; waiters.forEach(function(f){f(null);}); waiters=[]; });
  }

  function fill(){
    targets.forEach(function(el){
      if(el.hasAttribute('data-feed-il')){
        load(function(d){ d&&d.il ? renderIl(el,d.il) : renderIl(el,[]); });
      } else {
        var th=el.getAttribute('data-feed-theme');
        load(function(d){
          if(!d||!d.fr){ el.innerHTML='<div class="lw-empty">Le fil s\'affiche une fois le site déployé sur Vercel.</div>'; return; }
          var items = th==='all' ? d.fr : d.fr.filter(function(x){return x.theme===th;});
          renderFr(el, items);
        });
      }
    });
    var up=document.getElementById('lw-upd');
    if(up) up.textContent='mis à jour à '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  }
  fill();
  setInterval(function(){ data=null; fill(); }, 5*60*1000);
})();
