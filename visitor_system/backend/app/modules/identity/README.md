# Identity Module

Owns administrator identity and authorization concerns.

- `api.py`: auth and account management routes
- `deps.py`: current-user and permission dependencies
- `permissions.py`: permission enum and role mapping
- `schemas.py`: auth and account request/response models
- `service.py`: password hashing, token issuance, account workflows
- `user.py`, `user_role.py`: persistence model and role enum

Do not place appointment or reporting business rules here.
