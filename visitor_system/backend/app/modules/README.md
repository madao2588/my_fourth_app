# Backend Modules

The backend is organized by business capability instead of technical layer.

- `identity`: authentication, user accounts, roles, and permission checks
- `appointment`: visitor applications, approval workflow, and history queries
- `onsite`: inspection, check-in, and manual expiration operations
- `audit`: dashboard metrics, activity views, and operational log queries
- `scheduler`: background expiration worker and maintenance endpoints

Each module owns its API, schemas, and service logic. The backend entrypoint and
business flows now import these modules directly. Shared system response models
remain under `app.schemas.common`.
