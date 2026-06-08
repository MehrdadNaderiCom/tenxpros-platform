# TenXPros — Founder Admin Bootstrap Report

**Date:** 2026-06-08
**Result:** ✅ Founder admin `mail@mehrdadnaderi.com` created and verified. Production now has exactly one user, one admin.

---

## 1. Why the bootstrap minimum was lowered 12 → 6
The first bootstrap attempt was correctly refused by the script's 12-character guard. At the founder's explicit direction, the bootstrap script's minimum was lowered to **6 characters** to proceed quickly for launch, and a `--password-stdin` mode was added so the password can be piped from an interactive terminal **without a temp env file and without appearing on a command line**.

- **This is a temporary, intentional launch-speed exception, NOT the final password policy.** 12+ characters remains recommended. Rotate the founder password to a strong value after first login.
- The change is scoped to the founder bootstrap tooling only. It does **not** change public/participant password rules, auth, Prisma schema, or app logic.
- **Bootstrap-script change commit:** `7c4b4c4` ("Allow fast founder admin bootstrap via stdin") — committed, pushed, and deployed (image rebuilt) during the script-patch phase. QA before deploy: `node --check` OK · `typecheck` PASS · `test` 21/21 · `build` PASS.

## 2. Bootstrap execution
- Run by the operator in their own interactive terminal (my tool's stdin is not a TTY, so interactive input is not possible on my side). The password was typed silently (`read -s`), piped via stdin to `node scripts/bootstrap-admin.mjs --password-stdin`, and unset immediately.
- **Operator-reported result:** `BOOTSTRAP_RC=0`.
- **Independently verified** on the server (below). No temp env file was used; the password was never printed, echoed, stored in source, or written to `.env.production`.

## 3. Post-bootstrap counts (verified)
| Metric | Value | Expected |
|---|--:|---|
| users_total | 1 | 1 ✅ |
| admins_total | 1 | 1 ✅ |
| founder_admin_count (`mail@mehrdadnaderi.com`, ADMIN) | 1 | 1 ✅ |
| founder_has_password (hash present, non-empty) | true | true ✅ |

Founder record sanity (no secrets shown): `role=ADMIN`, `name="TenXPros Admin"`, email matches `mail@mehrdadnaderi.com`. `emailVerified` is not set — this is cosmetic; the credentials login checks the password hash, not email verification, so the founder can log in.

## 4. Route verification (live)
| Route | Code | Expected |
|---|--:|---|
| `/login` | 200 | 200 ✅ |
| `/admin` | 307 → login | redirect ✅ |
| `/admin/applications` | 307 → login | redirect ✅ |
| `/api/health` | 200 | 200 ✅ |

Admin routes remain protected when unauthenticated. (No login was performed.)

## 5. Confirmations
- **Password not printed/echoed/stored:** ✅ never displayed; passed only via stdin; success line masks the email (`m***@mehrdadnaderi.com`); hash never printed (only a boolean presence check).
- **`.env.production` not edited:** ✅ (the password was passed via `-e ADMIN_EMAIL=…` + stdin, not via the env file).
- **No application submitted, no payment triggered, no email sent:** ✅.
- **This verification turn:** no deploy and no container restart. (The only deploy this sprint was the bootstrap-script change `7c4b4c4`, done in the patch phase before bootstrap; verification itself mutated nothing except the operator-run admin upsert.)
- **DB mutation scope:** only the single founder-admin upsert (`mail@mehrdadnaderi.com`). No other user created.

## 6. Final git status
- Branch `deployment/production-deployment-sprint-a`, in sync with origin at `7c4b4c4` (script change committed + pushed).
- Uncommitted: only this report (`?? docs/design/TENXPROS_FOUNDER_ADMIN_BOOTSTRAP_REPORT.md`). `backups/` remains git-ignored. **Not committed, not pushed, not deployed.**

## 7. Next steps (operational, not in this sprint)
1. **Rotate the founder password** to 12+ chars after first login (currently another bootstrap run, since there is no change-password UI yet).
2. **Configure email** (`EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`) + restart, so application/acceptance emails actually send.
3. **Set `PAYMENT_LINK_FOUNDING`** (Wise/manual/Stripe) before accepting anyone.
4. Optionally restore the bootstrap minimum to 12 once the founder password is rotated.
