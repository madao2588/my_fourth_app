# Web Visitor Pages

Visitor-side logic is split by user flow:

- `home.js`: health check and visitor entry interactions
- `apply.js`: appointment submission flow
- `query.js`: phone-number status query flow
- `pass.js`: visitor pass rendering, QR preview, and payload copy

`main.js` now acts as the shared bootstrap and dispatcher. Visitor-specific
behavior should be added here before falling back to the main entry again.
