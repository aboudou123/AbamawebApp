/* ═══════════════════════════════════════════════════════════════════════════
   EIPV · animations d'accueil (anime.js)
   ═══════════════════════════════════════════════════════════════════════════

   Trois moments, et rien de plus :
     1. l'entrée du titre d'accueil, ligne par ligne ;
     2. le « 43 » de l'affiche anniversaire, qui monte depuis zéro ;
     3. le logo du pied de page, qui se dessine trait par trait.

   ── Deux principes qui gouvernent tout ce fichier ──────────────────────────

   **Le contenu n'est JAMAIS caché par la feuille de style.** Tout est visible
   sans JavaScript. C'est ce script qui met un élément dans son état de départ,
   juste avant de l'animer. Si anime.js ne se charge pas — réseau coupé, script
   bloqué — la page reste parfaitement lisible. L'inverse (cacher en CSS puis
   révéler en JS) laisserait une page blanche au moindre incident.

   **La bibliothèque pèse 115 Ko : on ne la télécharge pas pour rien.** Elle
   n'est demandée qu'après trois refus possibles : mouvement réduit demandé par
   le visiteur, connexion lente ou mode économie de données, et absence de toute
   cible sur la page. Un visiteur au Togo en 2G ne paiera pas ces 115 Ko pour
   une décoration.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var LIB = "/js/anime.min.js";

  /* ── Faut-il animer du tout ? ────────────────────────────────────────── */

  function motionWanted() {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    } catch (e) {
      /* navigateur sans matchMedia : on continue */
    }
    var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (c) {
      if (c.saveData === true) return false;
      if (/^(slow-)?2g$/.test(c.effectiveType || "")) return false;
    }
    return true;
  }

  function findTargets() {
    return {
      title: document.querySelector(".hero-grid h1"),
      count: document.querySelector(".poster-call-count"),
      logo: document.querySelector(".footer svg.brand-mark")
    };
  }

  /* ── Petits utilitaires ──────────────────────────────────────────────── */

  function onceVisible(el, run) {
    if (!("IntersectionObserver" in window)) { run(); return; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        io.unobserve(entries[i].target);
        run();
      }
    }, { threshold: 0.3, rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
  }

  function hide(el, shift) {
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(" + shift + "px)";
  }

  /* ── 1. L'entrée du titre d'accueil ──────────────────────────────────── */

  function playTitle(anime, h1) {
    var block = h1.closest(".reveal");

    /*
     * Le bloc du hero porte déjà la classe .reveal, qui le fait apparaître en
     * fondu. Deux animations superposées donneraient un mouvement mou : on fige
     * donc le conteneur dans son état final et on chorégraphie ses enfants.
     */
    if (block) {
      block.style.transition = "none";
      block.style.opacity = "1";
      block.style.transform = "none";
    }

    var scope = block || h1.parentNode;
    var lines = h1.querySelectorAll("span");
    var after = [
      scope.querySelector(".hero-sub"),
      scope.querySelector(".hero-cta"),
      scope.querySelector(".hero-trust")
    ].filter(Boolean);
    var kicker = scope.querySelector(".kicker");

    /*
     * `transform` ne s'applique pas à un élément inline. Les trois lignes du
     * titre sont des <span> séparés par des <br> : passés en inline-block, ils
     * gardent exactement la même mise en page tout en devenant animables.
     */
    for (var i = 0; i < lines.length; i++) {
      lines[i].style.display = "inline-block";
      hide(lines[i], 26);
    }
    hide(kicker, 12);
    after.forEach(function (el) { hide(el, 18); });

    var tl = anime.createTimeline({
      defaults: { ease: "out(3)", duration: 780 }
    });

    tl.add(kicker || lines[0], { opacity: 1, translateY: 0, duration: 520 });
    tl.add(lines, {
      opacity: 1,
      translateY: 0,
      delay: anime.stagger(110)
    }, "-=260");
    tl.add(after, {
      opacity: 1,
      translateY: 0,
      duration: 620,
      delay: anime.stagger(90)
    }, "-=420");
  }

  /* ── 2. Le « 43 » de l'affiche anniversaire ──────────────────────────── */

  function playCount(anime, el) {
    var target = parseInt(el.textContent.replace(/\D/g, ""), 10);
    if (!isFinite(target) || target <= 0) return; // rien à compter : on n'y touche pas

    onceVisible(el, function () {
      var state = { n: 0 };
      el.textContent = "0";
      anime.animate(state, {
        n: target,
        duration: 1500,
        ease: "out(4)",
        onUpdate: function () { el.textContent = String(Math.round(state.n)); },
        onComplete: function () { el.textContent = String(target); }
      });
    });
  }

  /* ── 3. Le logo du pied de page qui se dessine ───────────────────────── */

  function playLogo(anime, svgEl) {
    /*
     * Seuls les tracés ayant un contour peuvent être « dessinés ». La colombe
     * du logo est une forme pleine, sans contour : elle apparaît à la fin, en
     * fondu, une fois le reste tracé.
     */
    var strokes = svgEl.querySelectorAll("circle, path[stroke]");
    var solids = svgEl.querySelectorAll("path:not([stroke])");
    if (!strokes.length) return;

    onceVisible(svgEl, function () {
      var drawables = anime.svg.createDrawable(strokes);
      for (var i = 0; i < solids.length; i++) solids[i].style.opacity = "0";

      var tl = anime.createTimeline();
      tl.add(drawables, {
        draw: ["0 0", "0 1"],
        duration: 1100,
        ease: "inOut(2)",
        delay: anime.stagger(140)
      });
      if (solids.length) {
        tl.add(solids, { opacity: [0, 1], duration: 520, ease: "out(2)" }, "-=380");
      }
    });
  }

  /* ── Mise en route ───────────────────────────────────────────────────── */

  function start() {
    if (!motionWanted()) return;

    var t = findTargets();
    if (!t.title && !t.count && !t.logo) return; // aucune cible : pas de téléchargement

    var s = document.createElement("script");
    s.src = LIB;
    s.defer = true;
    s.onload = function () {
      var anime = window.anime;
      if (!anime || !anime.animate) return; // bibliothèque absente : la page reste telle quelle
      try {
        if (t.title) playTitle(anime, t.title);
        if (t.count) playCount(anime, t.count);
        if (t.logo) playLogo(anime, t.logo);
      } catch (e) {
        /*
         * Une animation qui échoue ne doit jamais emporter la page avec elle.
         * On remet simplement tout ce qui pourrait être resté masqué.
         */
        var hidden = document.querySelectorAll('[style*="opacity: 0"]');
        for (var i = 0; i < hidden.length; i++) {
          hidden[i].style.opacity = "1";
          hidden[i].style.transform = "none";
        }
      }
    };
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
