import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: '사용자 ID는 문자열이어야 합니다.' })
  userId!: string;

  @IsString({ message: '리프레시 토큰은 문자열이어야 합니다.' })
  refreshToken!: string;
}
