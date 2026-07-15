import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import type { CreateUserDto, UpdateUserDto } from './user.service';

@ApiTags('user')
@Controller('api/user')
export class UserController {
  constructor(private readonly service: UserService) {}

  // ── User CRUD (项 5) ──

  @Get()
  @ApiOperation({ summary: 'List all users' })
  async list() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async detail(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  async create(@Body() body: CreateUserDto) {
    return this.service.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ── Existing endpoints ──

  @Get('me/default-tank')
  @ApiOperation({ summary: 'Get the default tank for the current user' })
  @ApiQuery({ name: 'userId', required: true })
  async getDefaultTank(@Query('userId') userId: string) {
    return this.service.getDefaultTank(userId);
  }

  @Post('me/default-tank')
  @ApiOperation({ summary: 'Set the default tank for the current user' })
  async setDefaultTank(@Body() body: { tankId: string }) {
    return this.service.setDefaultTank(body.tankId);
  }

  @Get('me/fish-summary')
  @ApiOperation({ summary: 'v10.1.4 §4: Aggregated fish summary for /profile page' })
  @ApiQuery({ name: 'userId', required: true })
  async fishSummary(@Query('userId') userId: string) {
    return this.service.getFishSummary(userId);
  }

  @Get('me/fishes')
  @ApiOperation({ summary: 'v9.1 Item 5: Get all fish belonging to the user across all tanks, paginated' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyFishes(
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMyFishes(userId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }
}
