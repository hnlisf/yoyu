-- CreateIndex: add unique constraint on (user_id, name) for fish_tanks
-- Prevents MBE.1 race condition at DB layer
CREATE UNIQUE INDEX "fish_tanks_user_id_name_key" ON "fish_tanks"("user_id", "name");
