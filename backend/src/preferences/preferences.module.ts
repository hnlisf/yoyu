import { Module } from '@nestjs/common';
import { PreferencesController, FavoritesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PreferencesController, FavoritesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
