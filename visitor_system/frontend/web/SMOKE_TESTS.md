# Playwright Smoke Tests

This web folder now includes minimal smoke tests for core user flows.

## Covered Flows

1. Visitor submit + query flow.
2. Admin login + approve pending.
3. Admin onsite check-in.
4. Admin history + logs refresh (including logs load-more).

## Prerequisites

1. Backend is running at `http://127.0.0.1:8000`.
2. Python backend dependencies and DB migrations are already ready.
3. Node.js and npm are installed.

## Run

```bash
cd visitor_system/frontend/web
npm install
npm run verify
```

Run headed mode:

```bash
npm run smoke:headed
```

`verify` equals:

1. `npm run contract:check`
2. Edge Playwright smoke tests

If Edge channel setup is needed in your environment:

```bash
npm run smoke:install
```
