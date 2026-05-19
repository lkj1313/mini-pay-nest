import { IsString } from 'class-validator';

export class LogoutDto {
  @IsString({ message: '사용자 ID는 문자열이어야 합니다.' })
  userId!: string;
}
