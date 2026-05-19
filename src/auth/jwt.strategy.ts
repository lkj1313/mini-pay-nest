import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      //  헤더에서 토큰 꺼내는 방식
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 만료된 토큰은 거부할 건지
      ignoreExpiration: false,

      // 토큰 검증용 비밀키
      secretOrKey: process.env.JWT_SECRET || 'mini-pay-secret',
    });
  }

  //  토큰 payload가 유효하면 이 메서드 실행
  async validate(payload: { sub: string; email: string }) {
    // 여기서 반환한 객체가 바로 req.user에 들어감
    return { userId: payload.sub, email: payload.email };
  }
}
