(() => {
  const switchSelector = [
    'a[href*="/login-actions/registration"]',
    'a[href*="/login-actions/authenticate"]',
  ].join(",");
  const cache = new Map();
  let swapping = false;

  const loadPage = (url) => {
    if (!cache.has(url)) {
      cache.set(
        url,
        fetch(url, { credentials: "same-origin" }).then(async (response) => {
          if (!response.ok || new URL(response.url).origin !== window.location.origin) {
            throw new Error("Unable to load the authentication screen");
          }

          return {
            document: new DOMParser().parseFromString(await response.text(), "text/html"),
            url: response.url,
          };
        }),
      );
    }

    return cache.get(url);
  };

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

  const prefetchSwitch = () => {
    const link = document.querySelector(switchSelector);
    if (link) loadPage(link.href).catch(() => cache.delete(link.href));
  };

  const replacePanels = (nextDocument, nextUrl, animate = true) => {
    const shell = document.querySelector(".pf-v5-c-login__container");
    const nextShell = nextDocument.querySelector(".pf-v5-c-login__container");
    const nextHeader = nextShell?.querySelector("#kc-header");
    const nextMain = nextShell?.querySelector(".pf-v5-c-login__main");

    if (!shell || !nextHeader || !nextMain) {
      throw new Error("Authentication screen markup is incomplete");
    }

    const importedHeader = document.importNode(nextHeader, true);
    const importedMain = document.importNode(nextMain, true);
    importedMain.style.opacity = "0";

    shell.querySelector("#kc-header").replaceWith(importedHeader);
    shell.querySelector(".pf-v5-c-login__main").replaceWith(importedMain);
    shell.classList.remove("kc-auth-swapping");
    shell.removeAttribute("aria-busy");
    document.title = nextDocument.title;
    history.replaceState(history.state, "", nextUrl);
    window.scrollTo(0, 0);
    importedMain.scrollTop = 0;
    bindPasswordToggles(importedMain);

    injectBackLink(importedMain);

    if (!animate) {
      importedMain.style.removeProperty("opacity");
      window.scrollTo(0, 0);
      importedMain.scrollTop = 0;
      importedMain.querySelector("input")?.focus({ preventScroll: true });
      prefetchSwitch();
      return;
    }

    const enterAnimation = importedMain.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
    );
    enterAnimation.finished.then(() => {
      enterAnimation.cancel();
      importedMain.style.removeProperty("opacity");
      window.scrollTo(0, 0);
      importedMain.scrollTop = 0;
      importedMain.querySelector("input")?.focus({ preventScroll: true });
    });

    prefetchSwitch();
  };

  const swap = async (link) => {
    if (swapping) return;
    swapping = true;

    try {
      const targetUrl = link.href;
      const { document: nextDocument, url: nextUrl } = await loadPage(targetUrl);
      cache.delete(targetUrl);
      const shell = document.querySelector(".pf-v5-c-login__container");
      const header = shell?.querySelector("#kc-header");
      const main = shell?.querySelector(".pf-v5-c-login__main");

      if (!shell || !header || !main) throw new Error("Authentication screen is unavailable");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof header.animate !== "function") {
        replacePanels(nextDocument, nextUrl, false);
        return;
      }

      shell.classList.add("kc-auth-swapping");
      shell.setAttribute("aria-busy", "true");
      header.style.setProperty("border-radius", "29px", "important");

      const travel = shell.clientWidth - header.offsetWidth;
      const movingRight = !shell.querySelector("#kc-register-form");
      const distance = movingRight ? travel : -travel;
      const formAnimation = main.animate(
        [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(8px)" }],
        { duration: 170, easing: "ease-out", fill: "forwards" },
      );

      if (Math.abs(travel) < 2) {
        await formAnimation.finished.catch(() => undefined);
        replacePanels(nextDocument, nextUrl);
        return;
      }

      const brandAnimation = header.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }],
        { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      );
      await Promise.allSettled([brandAnimation.finished, formAnimation.finished]);
      replacePanels(nextDocument, nextUrl);
    } catch {
      window.location.assign(link.href);
    } finally {
      swapping = false;
    }
  };

  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      if (!(event.target instanceof Element)) return;
      const link = event.target.closest(switchSelector);
      if (!link || link.origin !== window.location.origin) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      void swap(link);
    },
    true,
  );

  const init = () => {
    bindPasswordToggles(document);
    injectBackLink(document);
    prefetchSwitch();
  };

  // This script is emitted in <head>, so the login form markup below it doesn't exist yet
  // when the IIFE runs synchronously — wait for the DOM before querying it.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
