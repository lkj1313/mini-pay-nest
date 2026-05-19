import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BaseException } from '../common/exception/base.exception';
import { AuthErrorCode } from './exception/auth-error-code';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async login(email: string, password: string) {
    // 유저 조회
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 이메일 없음 → 401
    if (!user) {
      throw new BaseException(AuthErrorCode.INVALID_CREDENTIALS);
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    //  비밀번호 틀림 → 401
    if (!isMatch) {
      throw new BaseException(AuthErrorCode.INVALID_CREDENTIALS);
    }

    // Access Token 발급 (15분)
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );

    //  Refresh Token 생성 (랜덤 UUID)
    const refreshToken = randomUUID();

    //  Redis에 저장 (7일 = 604800초)
    await this.redis.set(`refresh:${user.id}`, refreshToken, 604800);

    //  반환
    return { accessToken, refreshToken };
  }

  async refresh(userId: string, refreshToken: string) {
    // Redis에서 조회
    const stored = await this.redis.get(`refresh:${userId}`);

    // 없거나 다르면 401
    if (!stored || stored !== refreshToken) {
      throw new BaseException(AuthErrorCode.INVALID_REFRESH_TOKEN);
    }

    //  유저 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BaseException(AuthErrorCode.USER_NOT_FOUND);
    }

    // 새로운 Access Token 발급
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );

    return { accessToken };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
  }
}
