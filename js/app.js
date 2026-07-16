/* ════════════════════════════════════════════════════════════════
   EIPV · interactions partagées
   nav mobile · modales Don/Contact · partage · lecteur vidéo · reveal
═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ─── Icônes (inline SVG) ──────────────────────────────────── */
  var I = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.8-10-9.2C.4 8.6 2 5 5.5 5c2 0 3.3 1.1 4.5 2.6C11.2 6.1 12.5 5 14.5 5 18 5 19.6 8.6 22 11.8 19.5 16.2 12 21 12 21z"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 10h16M5 6l7-3 7 3M6 10v8M10 10v8M14 10v8M18 10v8"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92z"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    phoneSm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88M20.46 3.49A11.81 11.81 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.49-8.42"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15c0 .8.88 1.27 1.54.83l11.5-7.5a1 1 0 0 0 0-1.66L8.54 3.67A1 1 0 0 0 7 4.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
  };
  window.EIPV_ICONS = I;

  /* ─── Données de don (reprises de l'app existante) ─────────── */
  var DONATE = {
    bank: [
      { title: "Compte principal", accent: "blue", rows: [
        ["Titulaire", "Église Internationale Parole de Vie", false],
        ["Code Banque", "TG 138", false],
        ["Code Guichet", "01001", false],
        ["N° Compte", "040 187 190 009", false],
        ["Clé RIB", "54", false],
        ["IBAN", "TG53 TG13 8010 0104 0187 1900 0954", true]
      ], iban: "TG53TG138010010401871900954" },
      { title: "Deuxième compte", accent: "gold", rows: [
        ["Code Banque", "TG055", false],
        ["Code Guichet", "01701", false],
        ["N° Compte", "140 077 336 001", false],
        ["Clé RIB", "11", false],
        ["IBAN", "TG53 TG055 01701 14007 733 6001 11", true]
      ], iban: "TG53TG055017011400773360011" }
    ],
    moov: { numbers: ["+228 93 31 33 13"], code: "FL002" },
    fucec: { holder: "Église Internationale Parole de Vie", account: "59087" }
  };

  /* ─── Helpers ──────────────────────────────────────────────── */
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }
  function lockScroll(on) { document.body.style.overflow = on ? "hidden" : ""; }
  function tr(value) { return window.EIPV_I18N ? window.EIPV_I18N.t(value) : value; }

  /* ─── Modale générique ─────────────────────────────────────── */
  function openModal(node) {
    node.classList.add("open"); lockScroll(true);
    function onKey(e) { if (e.key === "Escape") close(); }
    function close() { node.classList.remove("open"); lockScroll(false); document.removeEventListener("keydown", onKey); }
    document.addEventListener("keydown", onKey);
    node.querySelectorAll("[data-close]").forEach(function (b) { b.onclick = close; });
    return close;
  }

  /* ─── Construction modale DON ──────────────────────────────── */
  function buildDonateRows(acct) {
    var rows = acct.rows.map(function (r) {
      return '<div class="brow ' + (r[2] ? "hl" : "") + '"><span class="bl">' + r[0] + '</span><span class="bv">' + r[1] + '</span></div>';
    }).join("");
    var copy = acct.iban ? '<button class="copy-btn" data-copy="' + acct.iban + '">' + I.copy + '<span>Copier l\'IBAN</span></button>' : "";
    return '<div class="acct"><div class="acct-head ' + acct.accent + '">' + I.bank + acct.title + '</div>' + rows + copy + '</div>';
  }

  function donatePanels() {
    var bank = DONATE.bank.map(buildDonateRows).join("");
    var moov = '<div class="acct"><div class="acct-head gold">' + I.phoneSm + 'Moov Money (Togo)</div>' +
      DONATE.moov.numbers.map(function (n) {
        return '<a class="brow" href="https://wa.me/22893313313" target="_blank" rel="noopener" style="text-decoration:none"><span class="bv" style="text-align:left;letter-spacing:.04em">' + n + '</span><span style="font-size:.72rem;font-weight:800;color:var(--primary);background:var(--primary-50);padding:.25rem .6rem;border-radius:8px">Soutien construction maison de Dieu</span></a>';
      }).join("") +
      '<div class="brow hl"><span class="bl">Code</span><span class="bv" style="font-size:1.3rem;letter-spacing:.3em;color:var(--gold-700)">' + DONATE.moov.code + '</span></div></div>';
    var fucec = '<div class="acct"><div class="acct-head blue">' + I.card + 'FUCEC · Togo</div>' +
      '<div class="brow"><span class="bl">Titulaire</span><span class="bv">' + DONATE.fucec.holder + '</span></div>' +
      '<div class="brow hl"><span class="bl">N° Compte</span><span class="bv">' + DONATE.fucec.account + '</span></div></div>';
    return { bank: bank, moov: moov, fucec: fucec };
  }

  function mountDonateModal() {
    if (document.getElementById("donate-modal")) return;
    var p = donatePanels();
    var node = el(
      '<div class="modal-root" id="donate-modal">' +
        '<div class="modal-backdrop" data-close></div>' +
        '<div class="modal-card" role="dialog" aria-modal="true" aria-label="Faire un don">' +
          '<div class="modal-head">' +
            '<div class="row gap-sm"><span class="mh-icon">' + I.heart + '</span>' +
            '<div><h3>Faire un don à l\'EIPV</h3><p style="font-size:.84rem;color:var(--muted);margin-top:4px">Votre générosité soutient la mission de Dieu.</p></div></div>' +
            '<button class="modal-close" data-close>' + I.x + '</button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<section class="donate-section"><p class="donate-section-title">' + I.bank + 'Banque</p>' + p.bank + '</section>' +
            '<section class="donate-section"><p class="donate-section-title">' + I.phoneSm + 'Mobile Money</p>' + p.moov + '</section>' +
            '<section class="donate-section"><p class="donate-section-title">' + I.card + 'FUCEC</p>' + p.fucec + '</section>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(node);
    return node;
  }

  /* ─── Construction modale CONTACT ──────────────────────────── */
  function mountContactModal() {
    if (document.getElementById("contact-modal")) return;
    var node = el(
      '<div class="modal-root" id="contact-modal">' +
        '<div class="modal-backdrop" data-close></div>' +
        '<div class="modal-card" role="dialog" aria-modal="true" aria-label="Contact">' +
          '<div style="height:4px;background:linear-gradient(90deg,rgba(30,58,95,.5),var(--gold),rgba(30,58,95,.5))"></div>' +
          '<div class="modal-head" style="border-bottom:1px solid var(--line)">' +
            '<div class="row gap-sm"><span class="mh-icon" style="background:rgba(30,58,95,.1);color:var(--primary)">' + I.msg + '</span>' +
            '<div><h3>Contactez-nous</h3><p style="font-size:.8rem;color:var(--muted);margin-top:2px">Nous sommes disponibles pour vous accompagner.</p></div></div>' +
            '<button class="modal-close" data-close style="background:var(--primary-50);color:var(--muted)">' + I.x + '</button>' +
          '</div>' +
          '<div class="modal-body" style="padding-top:1.1rem">' +
            contactRow(I.phone, "Téléphone", '<a href="tel:+22893313313" style="font-weight:800;color:var(--primary-900)">+228 93 31 33 13</a><p style="font-size:.78rem;color:var(--muted);margin-top:2px">Disponible 24h/24, 7j/7</p>') +
            '<a href="https://wa.me/22893313313" target="_blank" rel="noopener" class="row gap" style="margin-top:.8rem;padding:1rem;border:1px solid #BBF7D0;background:#F0FDF4;border-radius:16px;transition:all .2s ease">' +
              '<span style="width:42px;height:42px;border-radius:12px;background:#25D366;color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">' + I.wa + '</span>' +
              '<div style="flex:1"><p style="font-size:.66rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#15803D">WhatsApp</p><p style="font-weight:800;color:#14532D;margin-top:2px">Écrire sur WhatsApp</p></div>' +
              '<span style="color:#25D366">' + I.arrow + '</span></a>' +
            contactRow(I.mail, "Email", '<a href="mailto:contact@abamafrancois.org" style="font-weight:800;color:var(--primary-900);word-break:break-all">contact@abamafrancois.org</a>') +
            contactRow(I.clock, "Horaires", '<p style="font-weight:700;color:var(--primary-900)">Lun.-Dim. 08:00-17:00</p>') +
            '<a href="mailto:contact@abamafrancois.org?subject=Contact EIPV" class="btn btn-primary" style="width:100%;margin-top:1rem">' + I.mail + 'Envoyer un message</a>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(node);
    return node;
  }
  function contactRow(icon, label, body) {
    return '<div class="row gap" style="align-items:flex-start;margin-top:.8rem;padding:1rem;border:1px solid var(--line);background:#fff;border-radius:16px;box-shadow:var(--shadow-soft)">' +
      '<span style="width:42px;height:42px;border-radius:12px;background:var(--primary-50);color:var(--primary);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">' + icon + '</span>' +
      '<div style="flex:1;min-width:0"><p class="kicker" style="font-size:.66rem;margin-bottom:3px">' + label + '</p>' + body + '</div></div>';
  }

  /* ─── Lecteur vidéo (lightbox) ─────────────────────────────── */
  function mountVideoModal() {
    if (document.getElementById("video-modal")) return;
    var node = el(
      '<div class="modal-root" id="video-modal">' +
        '<div class="modal-backdrop" data-close></div>' +
        '<div class="modal-card modal-lg" role="dialog" aria-modal="true" aria-label="Lecteur vidéo" style="background:#0a1520">' +
          '<div class="modal-head" style="padding:.9rem 1.1rem"><div style="flex:1;min-width:0"><p class="kicker" style="color:var(--gold-200);font-size:.62rem" data-vcat></p><h3 style="color:#fff;font-size:1.15rem;margin-top:3px" data-vtitle></h3></div>' +
          '<button class="modal-close" data-close style="background:rgba(255,255,255,.12);color:#fff">' + I.x + '</button></div>' +
          '<div style="aspect-ratio:16/9;background:#000"><iframe data-vframe style="width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(node);
    return node;
  }

  /* ─── Partage (WhatsApp / Facebook / Copier) ───────────────── */
  function shareUrl(card) {
    var videoId = card.getAttribute("data-share-video-id");
    var u = videoId ? (location.origin + location.pathname) : (card.getAttribute("data-share-url") || (location.origin + location.pathname));
    try {
      var url = new URL(u, location.href);
      if (videoId) url.searchParams.set("video", videoId);
      return url.href;
    } catch (err) {
      return videoId ? u + "?video=" + encodeURIComponent(videoId) : u;
    }
  }
  function shareTitle(card) { return card.getAttribute("data-share-title") || tr("EIPV · Église Internationale Parole de Vie"); }
  function hydrateShareIcons(root) {
    (root || document).querySelectorAll(".share-btn[data-sh]").forEach(function (b) {
      if (b.innerHTML.trim()) return;
      var kind = b.getAttribute("data-sh");
      if (kind === "wa") b.innerHTML = I.wa;
      else if (kind === "fb") b.innerHTML = I.fb;
      else if (kind === "cp") b.innerHTML = I.copy;
    });
  }

  function wireShare(root) {
    hydrateShareIcons(root || document);
    (root || document).addEventListener("click", function (e) {
      var b = e.target.closest("[data-sh]");
      if (!b) return;
      var card = b.closest("[data-share-title]") || document.body;
      var url = encodeURIComponent(shareUrl(card));
      var title = encodeURIComponent(shareTitle(card));
      var kind = b.getAttribute("data-sh");
      if (kind === "wa") window.open("https://wa.me/?text=" + title + "%0A" + url, "_blank");
      else if (kind === "fb") window.open("https://www.facebook.com/sharer/sharer.php?u=" + url, "_blank");
      else if (kind === "cp") {
        navigator.clipboard.writeText(decodeURIComponent(url)).then(function () {
          b.classList.add("copied");
          var orig = b.innerHTML; b.innerHTML = I.check;
          setTimeout(function () { b.classList.remove("copied"); b.innerHTML = orig; }, 1800);
        });
      }
    });
  }

  function openSharedVideoFromUrl() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (err) { return; }
    var videoId = params.get("video");
    if (!videoId) return;
    var videos = Array.prototype.slice.call(document.querySelectorAll("[data-video]"));
    var target = videos.find(function (n) {
      return (n.getAttribute("data-video") || "").indexOf(videoId) !== -1;
    });
    if (target) setTimeout(function () { target.click(); }, 150);
  }

  /* ─── Bande d'annonce ─────────────────────────────────────────── */
  function wireAnnounceBar() {
    var bar = document.getElementById('announce-bar');
    if (!bar) return;
    if (sessionStorage.getItem('ann_closed')) { bar.style.display = 'none'; return; }
    var btn = bar.querySelector('.ann-close');
    if (!btn) return;
    btn.addEventListener('click', function () {
      bar.classList.add('ann-closing');
      sessionStorage.setItem('ann_closed', '1');
      setTimeout(function () { bar.style.display = 'none'; }, 400);
    });
  }

  /* ─── Partage de l'application ───────────────────────────────────────────────── */
  function shareApp() {
    var url   = location.origin + '/';
    var title = 'EIPV · Église Internationale Parole de Vie';
    var text  = 'Découvrez les enseignements du Pasteur Kossi François Abama.';
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
    } else {
      var copy = function () {
        var ta = document.createElement('textarea');
        ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(showShareToast).catch(function () { copy(); showShareToast(); });
      } else { copy(); showShareToast(); }
    }
  }

  function showShareToast() {
    var old = document.getElementById('share-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.id = 'share-toast';
    t.innerHTML = I.check + '<span>Lien copié !</span>';
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('share-toast-in'); });
    setTimeout(function () {
      t.classList.remove('share-toast-in');
      setTimeout(function () { t.remove(); }, 300);
    }, 2400);
  }

  /* ─── Copier (IBAN) ────────────────────────────────────────── */
  function wireCopy() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-copy]");
      if (!b) return;
      navigator.clipboard.writeText(b.getAttribute("data-copy")).then(function () {
        b.classList.add("copied");
        var span = b.querySelector("span"); var orig = span ? span.textContent : "";
        if (span) span.textContent = tr("Copié !");
        setTimeout(function () { b.classList.remove("copied"); if (span) span.textContent = orig; }, 2200);
      });
    });
  }

  /* ─── Reveal on scroll ─────────────────────────────────────── */
  function wireReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length || !("IntersectionObserver" in window)) { els.forEach(function (n) { n.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (n) { io.observe(n); });
  }

  /* ─── Nav mobile ───────────────────────────────────────────── */
  function wireNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;
    function set(open) { menu.classList.toggle("open", open); lockScroll(open); }
    toggle.onclick = function () { set(!menu.classList.contains("open")); };
    menu.addEventListener("click", function (e) { if (e.target === menu || e.target.closest("a")) set(false); });
  }

  /* ─── Filtres mobiles ──────────────────────────────────────── */
  function wireFilterToggles() {
    function mobileFiltersActive() {
      return window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
    }
    function closePanelFrom(target, scrollToResults) {
      if (!mobileFiltersActive()) return;
      var panel = target.closest("[data-filter-content]");
      if (!panel) return;
      panel.classList.remove("open");
      if (panel.id) {
        var toggle = document.querySelector('[data-filter-toggle][aria-controls="' + panel.id + '"]');
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
      if (!scrollToResults) return;
      window.setTimeout(function () {
        var wrap = panel.closest(".filters, .filter-bar") || panel.parentElement;
        var targetNode = wrap && wrap.nextElementSibling ? wrap.nextElementSibling : wrap;
        if (targetNode && targetNode.scrollIntoView) {
          targetNode.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 40);
    }
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-filter-toggle]");
      if (toggle) {
        var id = toggle.getAttribute("aria-controls");
        var panel = id ? document.getElementById(id) : null;
        if (!panel) return;
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        panel.classList.toggle("open", !open);
        return;
      }

      var filterButton = e.target.closest("[data-filter-content] button");
      if (filterButton) window.setTimeout(function () { closePanelFrom(filterButton, true); }, 0);
    });
    document.addEventListener("change", function (e) {
      var control = e.target.closest("[data-filter-content] select, [data-filter-content] input");
      if (control) window.setTimeout(function () { closePanelFrom(control, true); }, 0);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var control = e.target.closest("[data-filter-content] input");
      if (control) window.setTimeout(function () { closePanelFrom(control, true); }, 0);
    });
  }

  /* ─── Boot ─────────────────────────────────────────────────── */
  function boot() {
    mountDonateModal(); mountContactModal(); mountVideoModal();
    wireCopy(); wireShare(); wireReveal(); wireNav(); wireFilterToggles();
    wireAnnounceBar();

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-open]");
      if (t) {
        e.preventDefault();
        var which = t.getAttribute("data-open");
        if (which === "share-app") { shareApp(); return; }
        var id = which === "donate" ? "donate-modal" : which === "contact" ? "contact-modal" : null;
        if (id) openModal(document.getElementById(id));
        return;
      }
      var v = e.target.closest("[data-video]");
      if (v) {
        e.preventDefault();
        var vm = document.getElementById("video-modal");
        vm.querySelector("[data-vframe]").src = v.getAttribute("data-video");
        vm.querySelector("[data-vtitle]").textContent = v.getAttribute("data-video-title") || "";
        vm.querySelector("[data-vcat]").textContent = v.getAttribute("data-video-cat") || "";
        var close = openModal(vm);
        vm.querySelectorAll("[data-close]").forEach(function (b) {
          b.addEventListener("click", function () { vm.querySelector("[data-vframe]").src = ""; }, { once: true });
        });
      }
    });

    var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();
    openSharedVideoFromUrl();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
