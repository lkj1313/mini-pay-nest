import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SavingsProductType } from '@prisma/client';

export class CreateSavingsAccountDto {
  @IsEnum(SavingsProductType, {
    message: '적금 상품은 FIXED(정기) 또는 FLEXIBLE(자유)여야 합니다.',
  })
  @IsNotEmpty({ message: '적금 상품을 선택해주세요.' })
  productType!: SavingsProductType;

  @IsString({ message: '가입 금액은 문자열 형태의 숫자여야 합니다.' })
  @IsOptional()
  targetAmount?: string;
}
