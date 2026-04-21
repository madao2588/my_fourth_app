# Onsite Module

Owns operations performed at the gate or reception desk.

- `api.py`: inspect, check-in, and manual expire routes
- `schemas.py`: onsite operation payloads
- `service.py`: access-code inspection and state transitions during onsite flow

This module depends on appointment records but should not own application
submission, approval list queries, or dashboard reporting.
