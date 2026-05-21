import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TransferMode {
  INSTANT = 'INSTANT',
  REQUIRE_CONFIRM = 'REQUIRE_CONFIRM',
}

export class TransferToUserDto {
  @IsString({ message: '수신 계좌 ID는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '수신 계좌 ID를 입력해주세요.' })
  recipientAccountId!: string;

  @IsString({ message: '금액은 문자열 형태의 숫자여야 합니다.' })
  @IsNotEmpty({ message: '금액을 입력해주세요.' })
  amount!: string;

  @IsOptional()
  @IsEnum(TransferMode, {
    message: '송금 모드는 INSTANT 또는 REQUIRE_CONFIRM이어야 합니다.',
  })
  mode?: TransferMode;
}
