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
    bindPasswordToggles(importedMain);

    if (!animate) {
      importedMain.style.removeProperty("opacity");
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
      const brandAnimation = header.animate(
        [{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }],
        { duration: 480, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
      );
      const formAnimation = main.animate(
        [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(8px)" }],
        { duration: 170, easing: "ease-out", fill: "forwards" },
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

  bindPasswordToggles(document);
  prefetchSwitch();
})();
