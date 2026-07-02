-- AlterTable
ALTER TABLE "fish_species" ADD COLUMN "visual_variant" TEXT;

-- CreateTable
CREATE TABLE "temperature_adjust_job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tank_id" TEXT NOT NULL,
    "from_temp" REAL NOT NULL,
    "to_temp" REAL NOT NULL,
    "current_temp" REAL NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'exponential_decay',
    "tau_minutes" INTEGER NOT NULL DEFAULT 20,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    CONSTRAINT "temperature_adjust_job_tank_id_fkey" FOREIGN KEY ("tank_id") REFERENCES "fish_tanks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "water_change_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tank_id" TEXT NOT NULL,
    "fish_id" TEXT,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "water_status" TEXT NOT NULL DEFAULT 'changed',
    CONSTRAINT "water_change_logs_tank_id_fkey" FOREIGN KEY ("tank_id") REFERENCES "fish_tanks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_fish_tanks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '我的鱼缸',
    "size" TEXT NOT NULL DEFAULT 'medium',
    "temp" REAL NOT NULL DEFAULT 24.0,
    "city_temp" REAL NOT NULL DEFAULT 24.0,
    "heater_on" BOOLEAN NOT NULL DEFAULT false,
    "temperature" REAL,
    "weather_sync" JSONB,
    "temp_alert" JSONB,
    "location" TEXT NOT NULL DEFAULT 'Beijing',
    "last_weather_fetch_at" DATETIME,
    "cleanliness" REAL NOT NULL DEFAULT 100.0,
    "oxygen" REAL NOT NULL DEFAULT 100.0,
    "ph" REAL NOT NULL DEFAULT 7.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "fish_tanks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_fish_tanks" ("city_temp", "cleanliness", "created_at", "heater_on", "id", "name", "oxygen", "ph", "size", "temp", "temp_alert", "temperature", "updated_at", "user_id", "weather_sync") SELECT "city_temp", "cleanliness", "created_at", "heater_on", "id", "name", "oxygen", "ph", "size", "temp", "temp_alert", "temperature", "updated_at", "user_id", "weather_sync" FROM "fish_tanks";
DROP TABLE "fish_tanks";
ALTER TABLE "new_fish_tanks" RENAME TO "fish_tanks";
CREATE UNIQUE INDEX "fish_tanks_user_id_name_key" ON "fish_tanks"("user_id", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "temperature_adjust_job_tank_id_idx" ON "temperature_adjust_job"("tank_id");

-- CreateIndex
CREATE INDEX "temperature_adjust_job_status_idx" ON "temperature_adjust_job"("status");

-- CreateIndex
CREATE INDEX "water_change_logs_tank_id_idx" ON "water_change_logs"("tank_id");
