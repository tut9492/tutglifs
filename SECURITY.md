# Security Policy

## Our posture

GLiFS guide is a **static front-end**. There is no backend, no database, no
authentication, and **no wallet connection of any kind** — the site never requests
a wallet, signature, seed phrase, or private key, and the codebase ships no
wallet/crypto libraries. It collects no personal data and stores nothing about you.

Hardening in place:

- **Content-Security-Policy** and standard hardening headers
  (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`,
  `Permissions-Policy`, HSTS) — see [`next.config.ts`](./next.config.ts).
- No secrets in the repo, no `.env` required, no `eval`, no
  `dangerouslySetInnerHTML`.
- **Zero external requests at runtime.** All assets (glif images, the map
  backdrop, fonts) are served same-origin; CSP `connect-src`/`font-src` are
  locked to `'self'`. The only outbound fetches happen during the optional
  `npm run setup` (developer machine, official GLiFS image sources).

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private reporting: **Security → Report a vulnerability** on this
repository (GitHub Security Advisories). If that's unavailable, DM
[@tuteth_](https://x.com/tuteth_) on X to arrange a private channel.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a PoC if possible).
- Affected files / routes.

We'll acknowledge as soon as we can, keep you updated, and credit you on fix
(unless you'd rather stay anonymous).

## Scope

In scope: this repository's source, the built site, the asset-fetch script.

Out of scope: third-party services we merely link to or fetch open assets from
(OpenStreetMap, Protomaps, Transient Labs, glifs.art, x.com) — report issues in
those to their respective maintainers.

## Known advisories

`npm audit` reports moderate advisories in **transitive build-time** dependencies
of Next.js (e.g. `postcss` used by the bundler). They are not reachable in the
shipped static output and the only "fix" offered is an absurd Next downgrade, so
they are tracked and left until Next updates upstream. If you believe one is
actually exploitable here, please report it as above.
