# SentryPoint v5.0

A dark-mode threat-intelligence front end: indicator scanning (URL / IP / domain / file hash) and email breach-exposure checking, with a free tier and a Pro subscription.

## Structure
```
index.html          Landing page
scanner.html         Indicator scanner tool
breach-check.html    Email breach-exposure checker
pricing.html          Free vs Pro pricing ($50/mo, $600/yr)
login.html            Auth UI (front end only)
css/style.css         Design system
js/main.js             All client logic
```

## Deploying (GitHub Pages)
1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Your site is live at `https://<username>.github.io/<repo>/`.

No build step required — it's plain HTML/CSS/JS.

## Wiring up real data (required before this is a real product)

Right now `js/main.js` returns **simulated** scan and breach results so you can see the UI working. Before this goes live, you need a small backend — this cannot be done safely from the browser alone.

### 1. Indicator scanning (VirusTotal or similar)
- Create a backend endpoint, e.g. `POST /api/scan`.
- That endpoint calls the VirusTotal API using a server-side-only API key (never in client JS).
- Replace the mock body of `runScan()` in `js/main.js` with a `fetch('/api/scan', ...)` call, as commented in the file.

### 2. Breach checking (Have I Been Pwned or similar)
- Create a backend endpoint, e.g. `POST /api/breach-check`.
- Query a legitimate breach-directory API with a server-side key, respecting its terms of service.
- Return only **metadata** (breach name, date, exposed data categories) — never actual passwords or hashes.
- Replace the mock body of `runBreachCheck()` similarly.

### 3. Auth & billing
- Add real authentication (hashed passwords, session/JWT, HTTPS only, rate-limited login).
- Add a real payment processor (Stripe/Paddle) for the Pro tier, with entitlement checks enforced **server-side** — the free-tier quota in this demo uses `localStorage` only and must not be trusted as your real limiter.

## Features intentionally not included

This project does **not** implement, and won't:
- Retrieving or displaying anyone's actual saved passwords from an email lookup.
- Compiling personal/identity profiles (real name, social accounts, location) of domain owners or account holders.

Both cross from "security tool" into credential theft and doxxing tooling, and there's no way to build them that isn't harmful — so they're left out on purpose, free tier or paid.

## Suggested names
If you want alternatives to "SentryPoint": **Vantra**, **Cindex**, **Recon Ledger**, **Threadline**, **Perimeter5**, **Hollowpoint Intel** (edgier), **Signalfox**, **Breachlight**.
