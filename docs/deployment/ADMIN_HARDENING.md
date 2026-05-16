# Admin Hardening Notes

Admin access is the highest-risk operational surface in the launch MVP.

## Required Before Production

1. Change or remove any seed admin account before production launch.
2. Use a strong unique password generated outside the repository.
3. Do not commit admin credentials in `.env`, docs, scripts, screenshots, or reports.
4. Restrict admin account count to known operators.
5. Store credentials in a password manager.
6. Review audit logs after launch setup and after major admin actions.
7. Rotate secrets immediately if they are exposed.

## Bootstrap Guidance

Use `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for controlled bootstrap or local acceptance.

Production admin creation should happen through a one-off controlled process, admin console, or secret-managed script. Do not run the local seed in production.

## 2FA Status

Two-factor authentication is not implemented in the current launch scope.

Post-launch security improvement:

- Add 2FA for admin accounts.
- Add stricter admin session controls.
- Add admin login alerting.

## After Launch

- [ ] Confirm only expected admin accounts exist.
- [ ] Confirm the seed/local admin cannot access production.
- [ ] Confirm audit log records application, enrollment, ticket, dossier, and certification changes.
- [ ] Rotate bootstrap credentials after setup.
- [ ] Review hosting provider access permissions.
