-- Better Auth >= 1.7 identifica un account con (issuer, accountId).
-- La colonna viene aggiunta in tre passi invece che come NOT NULL diretto:
-- un ALTER ... ADD COLUMN NOT NULL senza default fallisce se la tabella
-- ha gia' delle righe, e qui puo' averne (account creati prima di questa
-- migrazione).

-- 1. Colonna nullable, cosi' l'ALTER passa sempre.
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint

-- 2. Backfill con la stessa convenzione usata da Better Auth:
--    `local:credential` per email+password, `local:oauth:<provider>` per gli OAuth.
UPDATE "account"
SET "issuer" = CASE
  WHEN "provider_id" = 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "provider_id"
END
WHERE "issuer" IS NULL;--> statement-breakpoint

-- 3. Ora che nessuna riga e' vuota, il vincolo si puo' applicare.
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint

-- 4. L'identita' non e' piu' (providerId, accountId) ma (issuer, accountId).
DROP INDEX IF EXISTS "account_provider_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_idx" ON "account" USING btree ("issuer","account_id");
