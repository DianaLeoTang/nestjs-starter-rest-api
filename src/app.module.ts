/*
 * @Author: Diana Tang
 * @Date: 2025-05-06 18:24:06
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/src/app.module.ts
 */
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticleModule } from './article/article.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [SharedModule, UserModule, AuthModule, ArticleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
