import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { IsPublic } from 'src/shared/auth/decorators/is-public.decorator'
import { LocalAuthGuard } from 'src/shared/auth/guards/local-auth.guard'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @IsPublic()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }

  @Put()
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto)
  }

  @Delete(':id')
  remove(@Param('id') userId: string) {
    return this.usersService.remove(+userId)
  }
}
