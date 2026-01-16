import { Module } from '@nestjs/common';
import { BigSpoonService } from './big-spoon.service';
import { BigSpoonController } from './big-spoon.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [BigSpoonController],
  providers: [BigSpoonService],
})
export class BigSpoonModule {}
