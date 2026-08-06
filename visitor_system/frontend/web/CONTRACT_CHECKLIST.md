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
- `POST /api/v1/apply` -> [appointment/api.py](../../backend/app/modules/appointment/api.py)
- `GET /api/v1/query/{phone}` -> [appointment/api.py](../../backend/app/modules/appointment/api.py)

### Auth/Admin Identity APIs

- `POST /api/v1/auth/login` -> [identity/api.py](../../backend/app/modules/identity/api.py)
- `GET /api/v1/auth/me` -> [identity/api.py](../../backend/app/modules/identity/api.py)
- `POST /api/v1/auth/change-password` -> [identity/api.py](../../backend/app/modules/identity/api.py)
- `GET /api/v1/auth/users` -> [identity/api.py](../../backend/app/modules/identity/api.py)
- `POST /api/v1/auth/users` -> [identity/api.py](../../backend/app/modules/identity/api.py)
- `PATCH /api/v1/auth/users/{user_id}/status` -> [identity/api.py](../../backend/app/modules/identity/api.py)

### Admin Business APIs

- `GET /api/v1/admin/pending` -> [appointment/api.py](../../backend/app/modules/appointment/api.py)
- `GET /api/v1/admin/stats` -> [audit/api.py](../../backend/app/modules/audit/api.py)
- `GET /api/v1/admin/overview` -> [audit/api.py](../../backend/app/modules/audit/api.py)
- `GET /api/v1/admin/logs` -> [audit/api.py](../../backend/app/modules/audit/api.py)
- `GET /api/v1/admin/list` -> [appointment/api.py](../../backend/app/modules/appointment/api.py)
- `PUT /api/v1/admin/approve/{record_id}` -> [appointment/api.py](../../backend/app/modules/appointment/api.py)
- `POST /api/v1/admin/check-in` -> [onsite/api.py](../../backend/app/modules/onsite/api.py)
- `POST /api/v1/admin/inspect` -> [onsite/api.py](../../backend/app/modules/onsite/api.py)
- `POST /api/v1/admin/expire` -> [onsite/api.py](../../backend/app/modules/onsite/api.py)
- `POST /api/v1/admin/expire-stale` -> [scheduler/api.py](../../backend/app/modules/scheduler/api.py)

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
