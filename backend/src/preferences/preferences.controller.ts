import { BadRequestException, Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';

@ApiTags('user')
@Controller('api/user/preferences')
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences (city, favorites, etc.)' })
  @ApiQuery({ name: 'userId', required: true })
  async get(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId required');
    return this.service.get(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences (city, lat, lng, favorites)' })
  async upsert(
    @Body()
    body: {
      userId: string;
      city?: string;
      lat?: number;
      lng?: number;
      favorites?: string[];
    },
  ) {
    if (!body.userId) throw new BadRequestException('userId required');
    return this.service.upsert(body);
  }
}

// v10.1.3-w4 §3: standalone favorites endpoints
@ApiTags('favorites')
@Controller('api/favorites')
export class FavoritesController {
  constructor(private readonly service: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user favorite species IDs' })
  @ApiQuery({ name: 'userId', required: true })
  async list(@Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId required');
    // BUG-V10.1.4-2 fix: removed dead speciesId check (variable doesn't exist in this method)
    return this.service.getFavorites(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a species to favorites' })
  async add(@Body() body: { userId: string; speciesId: string }) {
    if (!body.userId || !body.speciesId) throw new BadRequestException('userId and speciesId required');
    return this.service.addFavorite(body.userId, body.speciesId);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a species from favorites' })
  async remove(@Query('userId') userId: string, @Query('speciesId') speciesId: string) {
    if (!userId || !speciesId) throw new BadRequestException('userId and speciesId required');
    return this.service.removeFavorite(userId, speciesId);
  }
}
