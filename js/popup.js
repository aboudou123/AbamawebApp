(function () {
  /* ══ CONFIGURATION ═══════════════════════════════════════════════ */
  var IMAGE_URL  = "/images/annuel_femme.jpg";
  var TARGET_URL = "/convention-annuelle-femmes-2026";
  /* ════════════════════════════════════════════════════════════════ */

  var DELAY_OPEN    = 3000;   /* ms avant la 1re apparition         */
  var AUTO_CLOSE_MS = 3000;   /* ms avant fermeture automatique     */
  var REPEAT_MS     = 300000; /* ms entre chaque réaffichage (5min) */

  /* ── Styles ────────────────────────────────────────────────────── */
  var css = [
    "#eipv-pop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99999;",
    "display:flex;align-items:center;justify-content:center;padding:1rem;",
    "opacity:0;visibility:hidden;transition:opacity .45s ease,visibility .45s ease}",

    "#eipv-pop.on{opacity:1;visibility:visible}",

    "#eipv-pop-box{position:relative;width:100%;max-width:460px;border-radius:18px;",
    "overflow:hidden;background:#000;",
    "box-shadow:0 30px 80px rgba(0,0,0,.55),0 8px 28px rgba(0,0,0,.35);",
    "transform:scale(.85) translateY(24px);",
    "transition:transform .45s cubic-bezier(.34,1.56,.64,1)}",

    "#eipv-pop.on #eipv-pop-box{transform:scale(1) translateY(0)}",

    "#eipv-pop-img{display:block;width:100%;height:auto;cursor:pointer;",
    "border-radius:18px;transition:opacity .2s}",
    "#eipv-pop-img:hover{opacity:.9}",

    "#eipv-pop-x{position:absolute;top:10px;right:10px;width:34px;height:34px;",
    "border-radius:50%;background:rgba(0,0,0,.65);border:2px solid rgba(255,255,255,.65);",
    "color:#fff;font-size:20px;line-height:1;cursor:pointer;display:flex;",
    "align-items:center;justify-content:center;",
    "transition:background .2s,transform .2s;z-index:100001;",
    "font-family:Arial,sans-serif;padding:0}",
    "#eipv-pop-x:hover{background:rgba(255,255,255,.22);transform:scale(1.12) rotate(90deg)}",

    "#eipv-pop-bar{position:absolute;bottom:0;left:0;height:4px;width:100%;",
    "background:linear-gradient(90deg,#C9A84C,#f5d98a,#C9A84C);",
    "transform-origin:left center;transform:scaleX(1)}",
    "#eipv-pop-bar.run{transform:scaleX(0);",
    "transition:transform var(--eipv-dur,10s) linear}",

    "@media(max-width:500px){",
    "#eipv-pop-box{max-width:calc(100vw - 2rem);border-radius:14px}",
    "#eipv-pop-img{border-radius:14px}}"
  ].join("");

  var tag = document.createElement("style");
  tag.textContent = css;
  document.head.appendChild(tag);

  /* ── Markup ─────────────────────────────────────────────────────── */
  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<div id="eipv-pop" role="dialog" aria-modal="true"' +
    ' aria-label="Convention Annuelle des Femmes 2026">' +
      '<div id="eipv-pop-box">' +
        '<button id="eipv-pop-x" aria-label="Fermer">&#215;</button>' +
        '<img id="eipv-pop-img" src="' + IMAGE_URL + '"' +
        ' alt="Convention Annuelle des Femmes 2026 — La Puissance de la Langue">' +
        '<div id="eipv-pop-bar"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap.firstChild);

  /* ── Logique ─────────────────────────────────────────────────────── */
  var overlay   = document.getElementById("eipv-pop");
  var closeBtn  = document.getElementById("eipv-pop-x");
  var img       = document.getElementById("eipv-pop-img");
  var bar       = document.getElementById("eipv-pop-bar");
  var autoTimer = null;
  var repTimer  = null;
  var isOpen    = false;

  function openPopup() {
    if (isOpen) return;
    isOpen = true;
    bar.classList.remove("run");
    bar.style.setProperty("--eipv-dur", (AUTO_CLOSE_MS / 1000) + "s");
    bar.offsetWidth; /* reflow pour relancer l'animation */
    overlay.classList.add("on");
    requestAnimationFrame(function () { bar.classList.add("run"); });
    autoTimer = setTimeout(closePopup, AUTO_CLOSE_MS);
  }

  function closePopup() {
    if (!isOpen) return;
    isOpen = false;
    clearTimeout(autoTimer);
    clearTimeout(repTimer);
    overlay.classList.remove("on");
    bar.classList.remove("run");
    repTimer = setTimeout(openPopup, REPEAT_MS);
  }

  /* Démarrage */
  setTimeout(openPopup, DELAY_OPEN);

  /* Bouton X */
  closeBtn.addEventListener("click", closePopup);

  /* Clic sur le fond */
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closePopup();
  });

  /* Touche Échap */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) closePopup();
  });

  /* Clic sur l'image → fermer le popup */
  img.addEventListener("click", closePopup);

  /* Pause si l'onglet passe en arrière-plan */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearTimeout(autoTimer);
      clearTimeout(repTimer);
    }
  });

})();
