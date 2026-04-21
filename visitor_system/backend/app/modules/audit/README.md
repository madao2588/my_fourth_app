# Audit Module

Owns reporting and operational visibility.

- `api.py`: dashboard stats, overview, and log query routes
- `schemas.py`: stats, activity, and log response models
- `service.py`: aggregate queries and log-file parsing

This module reads appointment data but should not mutate appointment state.
