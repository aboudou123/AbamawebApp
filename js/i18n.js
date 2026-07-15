(function () {
  "use strict";

  var STORAGE_KEY = "eipv_language";
  var SUPPORTED = ["fr", "en"];
  var translations = window.EIPV_TRANSLATIONS || {};
  var currentLang = null;
  var observer = null;
  var textOrigins = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var applying = false;
  var reverseFrench = null;

  function normalizeLang(lang) {
    lang = String(lang || "").toLowerCase().slice(0, 2);
    return SUPPORTED.indexOf(lang) !== -1 ? lang : "fr";
  }

  function queryLang() {
    try {
      var lang = new URLSearchParams(window.location.search).get("lang");
      return lang ? normalizeLang(lang) : "";
    } catch (e) {
      return "";
    }
  }

  function pathLang() {
    var p = window.location.pathname.toLowerCase();
    if (p === "/en" || p.indexOf("/en/") === 0) return "en";
    if (p === "/fr" || p.indexOf("/fr/") === 0) return "fr";
    return "";
  }

  function storedLang() {
    try {
      var lang = localStorage.getItem(STORAGE_KEY);
      return lang ? normalizeLang(lang) : "";
    } catch (e) {
      return "";
    }
  }

  function initialLang() {
    var fromQuery = queryLang();
    if (fromQuery) return fromQuery;
    var stored = storedLang();
    if (stored) return stored;
    return pathLang() || "fr";
  }

  function pageId() {
    var p = window.location.pathname.toLowerCase();
    if (p.indexOf("enseignements") !== -1) return "teachings";
    if (p.indexOf("archives") !== -1) return "archives";
    if (p.indexOf("contact") !== -1) return "contact";
    return "home";
  }

  function dictionary(lang) {
    return translations[normalizeLang(lang)] || translations.fr || { strings: {}, meta: {} };
  }

  function t(value, lang) {
    var source = String(value == null ? "" : value);
    if (!source) return source;
    lang = normalizeLang(lang || currentLang || "fr");
    if (lang === "fr") {
      if (!reverseFrench) {
        reverseFrench = {};
        var enStrings = (translations.en && translations.en.strings) || {};
        Object.keys(enStrings).forEach(function (key) { reverseFrench[enStrings[key]] = key; });
      }
      return reverseFrench[source] || source;
    }
    var dict = dictionary(lang).strings || {};
    return dict[source] || source;
  }

  function locale(lang) {
    return dictionary(lang || currentLang || "fr").locale || (normalizeLang(lang) === "en" ? "en-US" : "fr-FR");
  }

  function shouldSkip(node) {
    var parent = node.parentNode;
    if (!parent || !parent.tagName) return true;
    return /^(SCRIPT|STYLE|NOSCRIPT|IFRAME|SVG|PATH)$/i.test(parent.tagName);
  }

  function translateTextNode(node, lang) {
    if (shouldSkip(node)) return;
    var raw = textOrigins && textOrigins.get(node);
    if (!raw) {
      raw = node.nodeValue;
      if (textOrigins) textOrigins.set(node, raw);
    }
    var match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) return;
    var core = match[2].trim();
    if (!core) return;
    var translated = t(core, lang);
    node.nodeValue = match[1] + translated + match[3];
  }

  function attrStoreName(attr) {
    return "data-i18n-origin-" + attr.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }

  function translateAttrs(el, lang) {
    var attrs = [
      "alt",
      "aria-label",
      "data-share-title",
      "data-share-url",
      "data-video-cat",
      "data-video-title",
      "placeholder",
      "title"
    ];
    attrs.forEach(function (attr) {
      if (!el.hasAttribute || !el.hasAttribute(attr)) return;
      var store = attrStoreName(attr);
      var original = el.getAttribute(store);
      if (!original) {
        original = el.getAttribute(attr);
        el.setAttribute(store, original);
      }
      el.setAttribute(attr, t(original, lang));
    });
  }

  function walk(root, lang) {
    if (!root) return;
    if (root.nodeType === 3) {
      translateTextNode(root, lang);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) translateAttrs(root, lang);

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) translateTextNode(node, lang);

    if (root.querySelectorAll) {
      root.querySelectorAll("[alt], [aria-label], [data-share-title], [data-video-cat], [data-video-title], [placeholder], [title]").forEach(function (el) {
        translateAttrs(el, lang);
      });
    }
  }

  function ensureMeta(name, attrName) {
    attrName = attrName || "name";
    var node = document.head.querySelector('meta[' + attrName + '="' + name + '"]');
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute(attrName, name);
      document.head.appendChild(node);
    }
    return node;
  }

  function ensureLink(rel, hreflang) {
    var selector = 'link[rel="' + rel + '"]' + (hreflang ? '[hreflang="' + hreflang + '"]' : "");
    var node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement("link");
      node.rel = rel;
      if (hreflang) node.hreflang = hreflang;
      document.head.appendChild(node);
    }
    return node;
  }

  function alternates() {
    var id = pageId();
    if (id === "home") {
      return { fr: "/fr/", en: "/en/", x: "/" };
    }
    var file = id === "teachings" ? "/enseignements.html" : id === "archives" ? "/archives.html" : "/contact.html";
    return { fr: file + "?lang=fr", en: file + "?lang=en", x: file };
  }

  function applyMeta(lang) {
    var id = pageId();
    var meta = (dictionary(lang).meta || {})[id] || {};
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";
    if (meta.title) document.title = meta.title;
    if (meta.description) {
      ensureMeta("description").setAttribute("content", meta.description);
      ensureMeta("og:description", "property").setAttribute("content", meta.description);
      ensureMeta("twitter:description").setAttribute("content", meta.description);
    }
    if (meta.title) {
      ensureMeta("og:title", "property").setAttribute("content", meta.title);
      ensureMeta("twitter:title").setAttribute("content", meta.title);
    }
    ensureMeta("og:locale", "property").setAttribute("content", lang === "en" ? "en_US" : "fr_FR");

    var alt = alternates();
    ensureLink("alternate", "fr").href = alt.fr;
    ensureLink("alternate", "en").href = alt.en;
    ensureLink("alternate", "x-default").href = alt.x;
    ensureLink("canonical").href = lang === "en" ? alt.en : alt.fr;
  }

  function switcherMarkup(context) {
    var label = dictionary(currentLang).ui && dictionary(currentLang).ui.switcherLabel || "Choisir la langue";
    return (
      '<div class="lang-switcher lang-switcher-' + context + '" role="group" aria-label="' + label + '">' +
        '<button type="button" data-lang-set="fr" aria-pressed="false"><span>FR</span></button>' +
        '<button type="button" data-lang-set="en" aria-pressed="false"><span>EN</span></button>' +
      '</div>'
    );
  }

  function ensureSwitchers() {
    document.querySelectorAll(".nav-right").forEach(function (nav) {
      if (nav.querySelector(".lang-switcher")) return;
      var wrap = document.createElement("div");
      wrap.innerHTML = switcherMarkup("nav");
      nav.insertBefore(wrap.firstElementChild, nav.firstElementChild);
    });
    document.querySelectorAll(".mobile-panel").forEach(function (panel) {
      if (panel.querySelector(".lang-switcher")) return;
      var wrap = document.createElement("div");
      wrap.innerHTML = switcherMarkup("mobile");
      var donate = panel.querySelector("[data-open='donate']");
      panel.insertBefore(wrap.firstElementChild, donate || null);
    });
  }

  function updateSwitchers(lang) {
    var ui = dictionary(lang).ui || {};
    document.querySelectorAll(".lang-switcher").forEach(function (group) {
      group.setAttribute("aria-label", ui.switcherLabel || "Choisir la langue");
      group.querySelectorAll("[data-lang-set]").forEach(function (btn) {
        var active = btn.getAttribute("data-lang-set") === lang;
        btn.classList.toggle("active", active);
        btn.setAttribute("aria-pressed", String(active));
        btn.setAttribute("title", (active ? (ui.currentLanguage || "Langue active") + ": " : "") + (dictionary(btn.getAttribute("data-lang-set")).name || btn.textContent.trim()));
      });
    });
  }

  function apply(lang, root) {
    applying = true;
    lang = normalizeLang(lang);
    currentLang = lang;
    document.documentElement.classList.toggle("lang-en", lang === "en");
    document.documentElement.classList.toggle("lang-fr", lang === "fr");
    ensureSwitchers();
    walk(root || document.body, lang);
    applyMeta(lang);
    updateSwitchers(lang);
    applying = false;
  }

  function setLang(lang, options) {
    lang = normalizeLang(lang);
    options = options || {};
    currentLang = lang;
    if (options.persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    }
    apply(lang);
    window.dispatchEvent(new CustomEvent("eipv:languagechange", { detail: { lang: lang, locale: locale(lang) } }));
  }

  function observe() {
    if (!("MutationObserver" in window) || observer) return;
    observer = new MutationObserver(function (mutations) {
      if (applying) return;
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          apply(currentLang || "fr", node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-lang-set]");
    if (!button) return;
    event.preventDefault();
    setLang(button.getAttribute("data-lang-set"));
  });

  window.EIPV_I18N = {
    apply: apply,
    getLang: function () { return currentLang || "fr"; },
    locale: locale,
    setLang: setLang,
    t: t
  };

  function boot() {
    currentLang = initialLang();
    try {
      var ql = queryLang();
      if (ql) localStorage.setItem(STORAGE_KEY, ql);
    } catch (e) {}
    apply(currentLang);
    observe();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
