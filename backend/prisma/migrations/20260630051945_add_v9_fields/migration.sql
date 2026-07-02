-- AlterTable
ALTER TABLE "fish" ADD COLUMN "adopted_days" INTEGER;
ALTER TABLE "fish" ADD COLUMN "instance_id" TEXT;
ALTER TABLE "fish" ADD COLUMN "status" TEXT;

-- AlterTable
ALTER TABLE "fish_tanks" ADD COLUMN "temp_alert" JSONB;
ALTER TABLE "fish_tanks" ADD COLUMN "temperature" REAL;
ALTER TABLE "fish_tanks" ADD COLUMN "weather_sync" JSONB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fish_species" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name_i18n" TEXT NOT NULL,
    "description_i18n" TEXT NOT NULL,
    "temp_min" REAL NOT NULL,
    "temp_max" REAL NOT NULL,
    "ph_min" REAL NOT NULL,
    "ph_max" REAL NOT NULL,
    "growth_days" INTEGER NOT NULL,
    "feed_freq" TEXT NOT NULL,
    "stages" TEXT NOT NULL,
    "feed_refuse_hint" TEXT,
    "color" TEXT NOT NULL DEFAULT '#5BA9C7',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "user_customized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_fish_species" ("color", "created_at", "description_i18n", "feed_freq", "feed_refuse_hint", "growth_days", "id", "is_default", "name_i18n", "ph_max", "ph_min", "stages", "temp_max", "temp_min") SELECT "color", "created_at", "description_i18n", "feed_freq", "feed_refuse_hint", "growth_days", "id", "is_default", "name_i18n", "ph_max", "ph_min", "stages", "temp_max", "temp_min" FROM "fish_species";
DROP TABLE "fish_species";
ALTER TABLE "new_fish_species" RENAME TO "fish_species";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '鱼友',
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "default_tank_id" TEXT,
    "max_tanks" INTEGER NOT NULL DEFAULT 6,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_default_tank_id_fkey" FOREIGN KEY ("default_tank_id") REFERENCES "fish_tanks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "default_tank_id", "id", "locale", "name", "updated_at") SELECT "created_at", "default_tank_id", "id", "locale", "name", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
