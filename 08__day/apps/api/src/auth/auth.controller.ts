import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { WalletLoginDto } from './dto/wallet-login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('wallet')
  @HttpCode(HttpStatus.OK)
  loginWithWallet(@Body() dto: WalletLoginDto) {
    return this.authService.loginWithWallet(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: { id: string; refreshToken: string | null }) {
    return this.authService.refresh(user.id, user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
  }

  @UseGuards(GithubAuthGuard)
  @Get('github')
  githubLogin() {}

  @UseGuards(GithubAuthGuard)
  @Get('github/callback')
  async githubCallback(@Req() req: Request) {
    const profile = req.user as {
      githubId: string;
      email?: string;
      username?: string;
    };
    return this.authService.loginWithGithub(profile);
  }
}
