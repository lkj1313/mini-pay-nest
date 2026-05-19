import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { BaseException } from '../common/exception/base.exception';

import { UserErrorCode } from './exception/user-error-code';
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    //  중복 체크
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BaseException(UserErrorCode.EMAIL_ALREADY_EXISTS);
    }

    // 해싱
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 트랜잭션
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
        },
      });

      await tx.account.create({
        data: {
          userId: createdUser.id,
          type: 'MAIN',
        },
      });

      return createdUser;
    });

    // passwordHash 제외
    const { passwordHash: _, ...result } = user;
    return result;
  }
}
