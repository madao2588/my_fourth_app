# Appointment Module

Owns the visitor appointment lifecycle before onsite handling.

- `api.py`: visitor apply/query routes and admin approval/history routes
- `schemas.py`: appointment request/response models
- `service.py`: appointment creation, approval, and history queries
- `appointment.py`, `appointment_status.py`: persistence model and status enum

This module should not implement check-in, log parsing, or scheduler loops.
