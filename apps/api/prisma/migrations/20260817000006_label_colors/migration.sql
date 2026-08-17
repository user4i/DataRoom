ALTER TABLE "TagDef" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b';
ALTER TABLE "StatusDef" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b';

UPDATE "TagDef" SET "color" = '#2563eb' WHERE "name" = 'Type1';
UPDATE "TagDef" SET "color" = '#d97706' WHERE "name" = 'Type2';
UPDATE "TagDef" SET "color" = '#16a34a' WHERE "name" = 'Type3';
UPDATE "StatusDef" SET "color" = '#16a34a' WHERE "name" = 'Approved';
UPDATE "StatusDef" SET "color" = '#d97706' WHERE "name" = 'For discussion';
UPDATE "StatusDef" SET "color" = '#dc2626' WHERE "name" = 'For deletion';
