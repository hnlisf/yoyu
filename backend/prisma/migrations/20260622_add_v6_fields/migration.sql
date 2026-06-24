-- v6.0: add defaultTankId to users
ALTER TABLE "users" ADD COLUMN "default_tank_id" TEXT REFERENCES "fish_tanks"("id") ON DELETE SET NULL;

-- v6.0: add heaterOn and cityTemp to fish_tanks
ALTER TABLE "fish_tanks" ADD COLUMN "heater_on" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "fish_tanks" ADD COLUMN "city_temp" REAL NOT NULL DEFAULT 24.0;

-- v6.0: add feedRefuseHint to fish_species
ALTER TABLE "fish_species" ADD COLUMN "feed_refuse_hint" TEXT;

-- v6.0: add mood to fish
ALTER TABLE "fish" ADD COLUMN "mood" INTEGER NOT NULL DEFAULT 80;
