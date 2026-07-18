---
name: seamless-auth-transitions
description: Use when fixing flicker, layout jumps, font swaps, border-radius snapping, or transitions between a React landing page and Keycloak sign-in or registration screens.
---

# Seamless Auth Transitions

Use this workflow for visual handoffs across React, Keycloak, and separate
origins. Preserve authentication boundaries: credentials remain on Keycloak,
tokens remain in memory, and the frontend continues to use Authorization Code
with PKCE.

## Diagnose Before Styling

1. Record the source and destination origins. Different ports are different
   origins, so a native cross-document View Transition cannot connect a Vite
   page on `:5173` to Keycloak on `:8080`.
2. Measure both states with `getBoundingClientRect()` and computed styles.
   Compare shell size and position, panel columns, border radius, font family,
   font size, line height, and field spacing.
3. Capture real layout shifts instead of judging screenshots alone:

```js
const shifts = [];
new PerformanceObserver((list) => shifts.push(...list.getEntries()))
  .observe({ type: "layout-shift", buffered: true });
```

4. Track `document.fonts` loading events. A heading that changes width after
   first paint is a font swap, not a transition timing problem.
5. Verify that the browser is using the current theme resource. Keycloak and
   the browser may cache an old stylesheet even after a container rebuild.

## Choose The Correct Boundary

### Landing To Keycloak

This is usually cross-origin in development. Do not depend on
`@view-transition` for continuity.

- Render a fixed handoff overlay on the landing page.
- Match the destination shell geometry, grid direction, colors, radius, and
  responsive breakpoint.
- Render the correct login or registration arrangement before navigation.
- Keep the overlay mounted until its entrance animation reaches the exact
  destination frame, then call `keycloak.login()` or `keycloak.register()`.
- Use the same font stack and explicit line heights on both surfaces.

### Keycloak Login To Registration

Both screens share an origin and auth session, but server navigation can still
flash or resize.

- Keep `.pf-v5-c-login__container` in the DOM.
- Prefetch the opposite screen with same-origin credentials.
- Parse the returned HTML and replace only `#kc-header` and
  `.pf-v5-c-login__main`.
- Preserve all server-generated form actions, hidden fields, tab ids, and
  client data from the fetched markup.
- Rebind behavior attached to replaced nodes, especially password visibility.
- Update the displayed URL with `history.replaceState()` without creating
  toggle-only history entries.
- Fall back to normal navigation when fetch or markup validation fails.

## Typography Rules

- The only guaranteed zero-swap solution is a font available at first paint.
  Prefer one identical system font stack across React, handoff, and Keycloak.
- If custom webfonts are required, self-host and preload them. Do not assume
  matching `font-family` declarations prevent fallback-to-webfont reflow.
- Keep font size and line height explicit on headings, labels, buttons, helper
  text, and auth-switch links.
- Remove unused font sources and their license records when reverting to system
  fonts.

## Geometry Rules

- Give login and registration the same fixed desktop shell dimensions. Let the
  form pane scroll internally when registration is longer.
- Keep the shell radius constant throughout the animation.
- If inner corners are visible while panels swap, round all panel corners from
  the first frame rather than interpolating square corners into rounded ones.
- Mirror the mobile Keycloak structure: compact brand bar first, form second,
  no desktop shell radius, and no horizontal overflow.
- Respect `prefers-reduced-motion` and provide an immediate functional swap.

## Keycloak Development Cache

During theme development, use the documented cache-disabling options:

```text
--spi-theme--static-max-age=-1
--spi-theme--cache-themes=false
--spi-theme--cache-templates=false
```

Rename a cached stylesheet once when an existing browser must receive the new
resource URL immediately. Re-enable caching for production.

## Verification

- Confirm landing handoff and Keycloak shell coordinates at desktop and mobile
  widths.
- Confirm both Keycloak directions keep the same shell node when using a DOM
  swap.
- Confirm password visibility still toggles after each swap.
- Confirm `scrollWidth === clientWidth` at narrow widths.
- Run `PerformanceObserver` again and require no visible text-related layout
  shifts.
- Check browser console and auth network requests.
- Run frontend typecheck, tests, lint, and production build.
- Rebuild Keycloak and verify the actual container, not only source CSS.

## Avoid

- Waiting one animation frame for a transition that lasts hundreds of
  milliseconds.
- Repeatedly tuning easing when the real cause is font loading or stale CSS.
- Copying Keycloak forms by hand and losing server-generated security fields.
- Relying on cross-document View Transitions across different ports.
- Persisting authentication state or tokens in `localStorage`.
