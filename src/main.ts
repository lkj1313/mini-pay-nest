import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
// JavaScript의 JSON.stringify()는 BigInt를 기본적으로 직렬화하지 못해 TypeError가 발생합니다.
// BigInt.prototype에 toJSON 메서드를 동적으로 추가하여, BigInt 값을 문자열로 변환하도록 합니다.
// 예: 1000n → "1000"
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
