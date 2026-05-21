import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { SettlementType } from '@prisma/client';

export class CreateSettlementDto {
  @IsString({ message: '금액은 문자열 형태의 숫자여야 합니다.' })
  @IsNotEmpty({ message: '총 금액을 입력해주세요.' })
  totalAmount!: string;

  @IsEnum(SettlementType, {
    message: '정산 타입은 EQUAL 또는 RANDOM이어야 합니다.',
  })
  @IsNotEmpty({ message: '정산 타입을 입력해주세요.' })
  type!: SettlementType;

  @IsArray({ message: '참여자 목록은 배열이어야 합니다.' })
  @ArrayMinSize(1, { message: '최소 1명 이상의 참여자가 필요합니다.' })
  @IsString({ each: true, message: '참여자 ID는 문자열이어야 합니다.' })
  participantUserIds!: string[];
}
