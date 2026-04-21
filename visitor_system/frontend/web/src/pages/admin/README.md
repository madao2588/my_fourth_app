# Web Admin Pages

Admin-side logic is split by responsibility:

- `shell.js`: admin navigation, role-based view access, and lazy data loading
- `accounts.js`: login, password change, current account, and admin user management
- `dashboard.js`: stats, overview, and stale-expiration maintenance
- `pending.js`: approval list and audit actions
- `onsite.js`: scan, inspect, check-in, expire, and confirm modal state
- `history.js`: history filters, pagination, and result rendering
- `logs.js`: log filters, load-more state, and copy actions

`main.js` now acts as the shared bootstrap and dispatcher. New admin behavior
should be added here before pushing more page-specific logic back into the main
entry again.
