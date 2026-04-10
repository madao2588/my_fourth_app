# Web Contract Checklist

This checklist tracks the current contract alignment for the Web frontend.

## 1. DOM Contract (`main.js` vs `admin.html` + `visitor.html`)

Check date: 2026-04-10

- `main.js byId(...)` count: `122`
- HTML `id="..."` count: `128`
- Missing ids required by `main.js`: `0`
- Extra ids in HTML not referenced by `main.js`: `6`

Extra ids currently present:

- `auth-section`
- `dashboard-section`
- `pending-section`
- `onsite-section`
- `history-section`
- `logs-section`

Notes:

- Section ids are expected for sidebar anchor navigation and module segmentation.
- The remaining extra ids are all section anchors used for page navigation.

## 2. API Contract (`src/services/api.js` vs backend routes)

The following frontend API calls are mapped to backend routes and currently aligned.

### Visitor APIs

- `GET /health` -> backend health endpoint in `app/main.py`
- `POST /api/v1/apply` -> [visitor.py](../../backend/app/api/routes/visitor.py)
- `GET /api/v1/query/{phone}` -> [visitor.py](../../backend/app/api/routes/visitor.py)

### Auth/Admin Identity APIs

- `POST /api/v1/auth/login` -> [auth.py](../../backend/app/api/routes/auth.py)
- `GET /api/v1/auth/me` -> [auth.py](../../backend/app/api/routes/auth.py)
- `POST /api/v1/auth/change-password` -> [auth.py](../../backend/app/api/routes/auth.py)
- `GET /api/v1/auth/users` -> [auth.py](../../backend/app/api/routes/auth.py)
- `POST /api/v1/auth/users` -> [auth.py](../../backend/app/api/routes/auth.py)
- `PATCH /api/v1/auth/users/{user_id}/status` -> [auth.py](../../backend/app/api/routes/auth.py)

### Admin Business APIs

- `GET /api/v1/admin/pending` -> [admin.py](../../backend/app/api/routes/admin.py)
- `GET /api/v1/admin/stats` -> [admin.py](../../backend/app/api/routes/admin.py)
- `GET /api/v1/admin/overview` -> [admin.py](../../backend/app/api/routes/admin.py)
- `GET /api/v1/admin/logs` -> [admin.py](../../backend/app/api/routes/admin.py)
- `GET /api/v1/admin/list` -> [admin.py](../../backend/app/api/routes/admin.py)
- `PUT /api/v1/admin/approve/{record_id}` -> [admin.py](../../backend/app/api/routes/admin.py)
- `POST /api/v1/admin/check-in` -> [admin.py](../../backend/app/api/routes/admin.py)
- `POST /api/v1/admin/inspect` -> [admin.py](../../backend/app/api/routes/admin.py)
- `POST /api/v1/admin/expire` -> [admin.py](../../backend/app/api/routes/admin.py)
- `POST /api/v1/admin/expire-stale` -> [admin.py](../../backend/app/api/routes/admin.py)

## 3. Regression Steps (Quick)

Use this sequence after any HTML/JS/API adjustment.

1. Open `visitor.html`: submit appointment -> query by phone.
2. Open `admin.html`: login -> change password (if forced).
3. Load pending list -> approve one item.
4. Inspect/check-in with access code.
5. Open history with filter and pagination.
6. Open logs, filter by level/keyword, then click load more.
7. Trigger `Expire Stale Approved`.

Recommended command:

```bash
npm run verify
```

## 4. Next Improvements

- Wire `npm run contract:check` into CI pipeline.
- Ensure Playwright browser binary installation is available in CI/runtime.
- Keep section anchor ids in sync with sidebar links and module section ids.
