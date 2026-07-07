import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AdminAnalyticsService } from './src/finance/service/admin-analytics.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(AdminAnalyticsService);
  try {
    const res = await service.getOverview({ window: '30d', timezone: 'Africa/Lagos' });
    console.log("SUCCESS:", JSON.stringify(res).slice(0, 100));
  } catch (e) {
    console.error("ERROR:", e);
  }
  await app.close();
}
bootstrap();
