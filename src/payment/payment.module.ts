import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AppointmentModule } from 'src/appointment/appointment.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AppointmentModule, ConfigModule,],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule { }
