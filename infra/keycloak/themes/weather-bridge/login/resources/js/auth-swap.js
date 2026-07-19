(() => {
  const backIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

  const APP_URL_KEY = "wba:app-origin";

  // keycloak.login() uses location.replace(), which drops the FE's history entry, so
  // history.back() can't be trusted to land on the FE — persist the redirect_uri origin
  // (only present in the query string on the first hop) across the whole auth flow instead.
  const getAppUrl = () => {
    try {
      const redirectUri = new URLSearchParams(window.location.search).get("redirect_uri");
      if (redirectUri) {
        const origin = new URL(redirectUri).origin;
        sessionStorage.setItem(APP_URL_KEY, origin);
        return origin;
      }
    } catch {
      /* malformed redirect_uri, fall through */
    }
    try {
      const stored = sessionStorage.getItem(APP_URL_KEY);
      if (stored) return stored;
    } catch {
      /* sessionStorage unavailable, fall through */
    }
    try {
      return document.referrer ? new URL(document.referrer).origin : null;
    } catch {
      return null;
    }
  };

  const injectBackLink = (root) => {
    const header = root.querySelector(".pf-v5-c-login__main-header");
    if (!header || header.querySelector(".wba-back-link")) return;

    // On the registration step, "back" means the previous step of the auth flow (the
    // login form), not exiting all the way out to the FE app — reuse the page's own
    // "already have an account? log in" link so it goes through the normal swap animation.
    if (root.querySelector("#kc-register-form")) {
      const toLogin = root.querySelector('a[href*="/login-actions/authenticate"]');
      if (toLogin) {
        const link = document.createElement("a");
        link.href = toLogin.href;
        link.className = "wba-back-link";
        link.innerHTML = `${backIcon}<span>Quay lại</span>`;
        header.prepend(link);
        return;
      }
    }

    const appUrl = getAppUrl();
    if (!appUrl && history.length <= 1) return;

    const link = document.createElement("button");
    link.type = "button";
    link.className = "wba-back-link";
    link.innerHTML = `${backIcon}<span>Quay lại</span>`;
    link.onclick = () => {
      if (appUrl) window.location.assign(`${appUrl}/login`);
      else history.back();
    };
    header.prepend(link);
  };

  const bindPasswordToggles = (root) => {
    root.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.onclick = () => {
        const input = document.getElementById(button.getAttribute("aria-controls"));
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.children.item(0).className = visible ? button.dataset.iconShow : button.dataset.iconHide;
        button.setAttribute("aria-label", visible ? button.dataset.labelShow : button.dataset.labelHide);
      };
    });
  };

  const init = () => {
    bindPasswordToggles(document);
    injectBackLink(document);
  };

  // This script is emitted in <head>, so the login form markup below it doesn't exist yet
  // when the IIFE runs synchronously — wait for the DOM before querying it.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
