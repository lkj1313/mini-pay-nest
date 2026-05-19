import { IsNotEmpty, IsString } from 'class-validator';

export class ChargeMainAccountDto {
  @IsString({ message: '금액은 문자열 형태의 숫자여야 합니다.' })
  @IsNotEmpty({ message: '금액을 입력해주세요.' })
  amount!: string;
}
