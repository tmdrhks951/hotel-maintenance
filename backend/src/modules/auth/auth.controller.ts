import { Request, Response, NextFunction } from 'express';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import * as authService from './auth.service';

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = LoginDto.parse(req.body);
    const result = await authService.login(input.email, input.password);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = RefreshTokenDto.parse(req.body);
    const result = await authService.refresh(input.refreshToken);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = RefreshTokenDto.parse(req.body);
    await authService.logout(input.refreshToken);

    res.status(200).json({ success: true, message: '로그아웃 되었습니다' });
  } catch (err) {
    next(err);
  }
}
