import { Controller, Get, Query } from '@nestjs/common';
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
}
