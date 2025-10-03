import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { BookAppointmentDto } from './dto/appointment.dto';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) { }

  @Get('available-dates')
  async getDates() {
    const dates = await this.appointmentService.getAvailableDates();
    return dates;
  }

  @Get('available')
  async getSlots(@Query('date') date: string) {
    const slots = await this.appointmentService.getAvailableSlots(date);
    return slots;

  }

  @Post('book')
  async book(@Body() body: BookAppointmentDto) {
    const { slotId, name, email } = body;
    const result = await this.appointmentService.bookAppointment(slotId, name, email);

    if (result.affected === 1) {
      return { message: 'Appointment booked successfully.' };
    } else {
      return { message: 'Slot already booked or invalid.' };
    }
  }
}
