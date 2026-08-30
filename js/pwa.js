(function () {
  "use strict";

  var deferredPrompt = null;
  var installButton = null;
  var isLocalhost = ["localhost", "127.0.0.1", "::1"].indexOf(window.location.hostname) !== -1;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function createInstallButton() {
    if (installButton) return installButton;

    installButton = document.createElement("button");
    installButton.className = "pwa-install-btn";
    installButton.type = "button";
    installButton.setAttribute("aria-label", "Installer l'application EIPV");
    installButton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>' +
      "</svg>" +
      "<span>Installer l'application</span>";

    installButton.addEventListener("click", function () {
      if (!deferredPrompt) return;

      installButton.classList.remove("is-visible");
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
      });
    });

    document.body.appendChild(installButton);
    return installButton;
  }

  function showInstallButton() {
    if (isStandalone()) return;
    createInstallButton().classList.add("is-visible");
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && !isLocalhost) return;

    /*
     * Quand une nouvelle version prend la main, la page déjà affichée continue
     * de tourner avec les anciens scripts et l'ancien dictionnaire : on voyait
     * du français sur la page anglaise jusqu'à la navigation suivante. On la
     * recharge donc une fois, immédiatement.
     *
     * Deux garde-fous contre la boucle : au tout premier chargement il n'y a
     * pas encore de contrôleur, la prise de contrôle est normale et ne doit
     * rien déclencher ; et le rechargement n'a lieu qu'une seule fois par page.
     */
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(function () {
        /* The app remains usable if the browser blocks registration. */
      });
    });
  }

  function bootInstallPrompt() {
    if (isStandalone()) {
      document.documentElement.classList.add("pwa-standalone");
      return;
    }

    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      showInstallButton();
    });

    window.addEventListener("appinstalled", function () {
      deferredPrompt = null;
      if (installButton) installButton.classList.remove("is-visible");
      document.documentElement.classList.add("pwa-standalone");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootInstallPrompt);
  } else {
    bootInstallPrompt();
  }

  registerServiceWorker();
})();
