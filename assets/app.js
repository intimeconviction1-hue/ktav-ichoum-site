/* KTAV ICHOUM — interactions front (léger, sans dépendance) */
(function () {
  "use strict";

  // ---- Thème clair/sombre (sombre par défaut) ----
  var root = document.documentElement;
  function setTheme(t){ root.setAttribute("data-theme", t); try{localStorage.setItem("ki-theme",t);}catch(e){} var b=document.querySelectorAll("[data-theme-toggle]");
    b.forEach(function(x){ x.setAttribute("aria-pressed", t === "light"); }); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-theme-toggle]");
    if (t) { setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); }
  });

  try{var savedTheme=localStorage.getItem("ki-theme");if(savedTheme==="light"||savedTheme==="dark")setTheme(savedTheme);}catch(e){}
  var menu=document.querySelector(".mobile-menu"), menuOpener;
  document.querySelectorAll("[data-menu-open]").forEach(function(b){b.setAttribute("aria-expanded","false");});
  function closeMenu(){
    if(!menu)return;
    menu.classList.remove("open");document.body.classList.remove("ki-menu-open");
    document.querySelectorAll("[data-menu-open]").forEach(function(b){b.setAttribute("aria-expanded","false");});
    if(menuOpener)menuOpener.focus();
  }
  document.addEventListener("click",function(e){
    var opener=e.target.closest("[data-menu-open]");
    if(opener&&menu){
      menuOpener=opener;menu.classList.add("open");document.body.classList.add("ki-menu-open");
      opener.setAttribute("aria-expanded","true");
      var close=menu.querySelector("[data-menu-close]");if(close)close.focus();
    }
    if(e.target.closest("[data-menu-close]"))closeMenu();
    if(menu&&menu.classList.contains("open")&&e.target.closest(".mobile-menu a"))closeMenu();
  });
  document.addEventListener("keydown",function(e){
    if(!menu||!menu.classList.contains("open"))return;
    if(e.key==="Escape"){closeMenu();return;}
    if(e.key==="Tab"){
      var controls=Array.from(menu.querySelectorAll("a[href],button")).filter(function(x){return x.getClientRects().length;});
      var first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  document.querySelectorAll(".nav a,.mobile-menu nav a").forEach(function(a){
    if(new URL(a.href).pathname===location.pathname.replace(/\\.html$/,""))a.setAttribute("aria-current","page");
  });
  var main=document.querySelector("main")||document.querySelector(".rec-intro")||document.querySelector(".hero");
  if(main){
    if(!main.id)main.id="contenu";
    main.setAttribute("tabindex","-1");
    var skip=document.createElement("a");skip.href="#"+main.id;skip.className="ki-skip";skip.textContent="Aller au contenu";
    document.body.prepend(skip);
  }
  document.addEventListener("click",function(e){
    var copy=e.target.closest('[data-partage="copier"]');
    if(!copy)return;e.preventDefault();
    function notify(message){var n=document.createElement("div");n.className="ki-feedback";n.setAttribute("role","status");n.textContent=message;document.body.append(n);setTimeout(function(){n.remove();},3000);}
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(copy.href).then(function(){notify("Lien copié");}).catch(function(){notify("Copie indisponible : utilisez la barre d’adresse.");});
    }else{notify("Copie indisponible : utilisez la barre d’adresse.");}
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
