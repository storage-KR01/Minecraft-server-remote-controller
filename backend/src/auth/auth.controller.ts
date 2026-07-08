import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

type LoginBody = {
  username: string;
  password: string;
};

type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

type CookieRequest = Request & {
  cookies?: Record<string, string>;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Public()
  async login(@Body() body: LoginBody, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body.username, body.password);
    response.cookie('scc_session', result.sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
    return { user: result.user };
  }

  @Post('logout')
  @Roles('Admin', 'Operator', 'Viewer')
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.scc_session);
    response.clearCookie('scc_session', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @Roles('Admin', 'Operator', 'Viewer')
  async me(@Req() request: CookieRequest) {
    return {
      authenticated: true,
      user: await this.auth.validateSession(request.cookies?.scc_session)
    };
  }

  @Post('change-password')
  @Roles('Admin', 'Operator', 'Viewer')
  async changePassword(@Req() request: CookieRequest, @Body() body: ChangePasswordBody) {
    const user = await this.auth.validateSession(request.cookies?.scc_session);
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    return { ok: true };
  }
}
