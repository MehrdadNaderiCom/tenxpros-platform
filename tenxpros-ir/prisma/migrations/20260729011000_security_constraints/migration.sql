-- Preserve one open application per member even under concurrent submissions.
CREATE UNIQUE INDEX "Application_one_open_per_user_key"
ON "Application" ("userId")
WHERE "status" NOT IN ('REJECTED', 'WITHDRAWN');
