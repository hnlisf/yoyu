-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '鱼友',
    "locale" TEXT NOT NULL DEFAULT 'zh',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "fish_species" (
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
    "color" TEXT NOT NULL DEFAULT '#5BA9C7',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "fish_tanks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '我的鱼缸',
    "size" TEXT NOT NULL DEFAULT 'medium',
    "temp" REAL NOT NULL DEFAULT 24.0,
    "cleanliness" REAL NOT NULL DEFAULT 100.0,
    "oxygen" REAL NOT NULL DEFAULT 100.0,
    "ph" REAL NOT NULL DEFAULT 7.0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "fish_tanks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tank_id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "birthday" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" TEXT NOT NULL DEFAULT 'fry',
    "growth" REAL NOT NULL DEFAULT 0.0,
    "health" REAL NOT NULL DEFAULT 100.0,
    "nutrition" REAL NOT NULL DEFAULT 100.0,
    "last_fed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fish_tank_id_fkey" FOREIGN KEY ("tank_id") REFERENCES "fish_tanks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fish_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "fish_species" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "feed_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fish_id" TEXT NOT NULL,
    "fed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" TEXT NOT NULL DEFAULT 'normal',
    CONSTRAINT "feed_records_fish_id_fkey" FOREIGN KEY ("fish_id") REFERENCES "fish" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title_i18n" TEXT NOT NULL,
    "due_at" DATETIME NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weather_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "data" TEXT NOT NULL,
    "cached_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "weather_cache_lat_lon_idx" ON "weather_cache"("lat", "lon");
