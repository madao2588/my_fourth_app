# Scheduler Module

Owns maintenance jobs and background task entry points.

- `api.py`: maintenance endpoints such as bulk stale-expiration
- `schemas.py`: maintenance response models
- `service.py`: expiration worker and stale-appointment cleanup logic

This module can mutate appointment state through maintenance workflows but
should not host user-facing query or authentication logic.
