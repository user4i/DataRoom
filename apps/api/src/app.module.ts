import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { StorageModule } from './storage/storage.module';
import { DataRoomsModule } from './data-rooms/data-rooms.module';
import { FoldersModule } from './folders/folders.module';
import { FilesModule } from './files/files.module';
import { SharesModule } from './shares/shares.module';
import { DevModule } from './dev/dev.module';
import { localeMiddleware } from './i18n/locale.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AccessModule,
    StorageModule,
    AuthModule,
    DataRoomsModule,
    FoldersModule,
    FilesModule,
    SharesModule,
    // Dev seed/debug routes — omitted when NODE_ENV is production.
    ...(process.env.NODE_ENV === 'production' ? [] : [DevModule]),
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(localeMiddleware).forRoutes('*');
  }
}
