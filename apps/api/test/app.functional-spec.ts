import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { DataRoomsController } from '../src/data-rooms/data-rooms.controller';
import { DataRoomsService } from '../src/data-rooms/data-rooms.service';
import { HealthController } from '../src/health.controller';
import { PrismaModule } from '../src/prisma/prisma.module';
import { StorageService } from '../src/storage/storage.service';

describe('API functional (base)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || 'postgresql://ci:ci@127.0.0.1:5432/ci';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
      ],
      controllers: [HealthController, DataRoomsController],
      providers: [
        { provide: DataRoomsService, useValue: { list: jest.fn() } },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('POST /auth/login rejects an invalid body', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });

  it('GET /auth/me rejects a missing token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /data-rooms rejects a missing token', async () => {
    await request(app.getHttpServer()).get('/data-rooms').expect(401);
  });
});
