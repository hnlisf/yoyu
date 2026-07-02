import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('api/user')
export class UserController {
  constructor(private readonly service: UserService) {}

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
