import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  email!: string;

  @IsString({ message: '이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name!: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  @MinLength(6, { message: '비밀번호는 6자 이상이어야 합니다.' })
  password!: string;
}
