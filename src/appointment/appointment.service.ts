import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { CalendarService } from 'src/calendar/calendar.service';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly calendarservice: CalendarService,
    private readonly mailService: MailService,
  ) { }

  // Get available dates
  async getAvailableDates(): Promise<string[]> {
    const results = await this.appointmentRepo
      .createQueryBuilder('appointment')
      .select('DATE(appointment.startTime)', 'date')
      .where('appointment.isBooked = :booked', { booked: false })
      .distinct(true)
      .getRawMany();

    return results.map(r => r.date);
  }

  // Get available slots for a date
  async getAvailableSlots(date: string): Promise<Appointment[]> {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    return this.appointmentRepo.find({
      where: {
        startTime: Between(start, end),
        isBooked: false,
      },
      select: ['id', 'startTime'],
      order: { startTime: 'ASC' },
    });
  }

  // Book a slot
  async bookAppointment(id: number, name: string, email: string): Promise<any> {
    const appointment = await this.appointmentRepo.findOneBy({ id });
    if (!appointment || appointment.isBooked) {
      throw new Error('Slot already booked or not found');
    }
    await this.appointmentRepo.update(
      { id, isBooked: false },
      {
        name,
        email,
        isBooked: true,
        endTime: () => 'DATE_ADD(start_time, INTERVAL 3 HOUR)',
      },
    );

    const updatedAppointment = await this.appointmentRepo.findOneBy({ id });

    if (!updatedAppointment) {
      throw new Error('Failed to fetch updated appointment');
    }

    const startTime = new Date(updatedAppointment.startTime);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);

    await this, this.calendarservice.createEvent({
      summary: `Appointment with ${name}`,
      description: `Email: ${email}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });



    try {
      await this.mailService.sendMail(
        updatedAppointment.email,
        'Your appointment is confirmed',
        `
          Hi ${updatedAppointment.name},

          Your appointment is confirmed with the following details:

          Start Time: ${startTime.toLocaleString()}

          Thank you!
        `,
      );
    } catch (error) {
      console.error('Failed to send confirmation email to user:', error);
    }

    // Send admin notification email
    try {
      await this.mailService.sendMail(
        'germanysoon0@gmail.com',
        `New Appointment Booked by ${updatedAppointment.name}`,
        `
          A new appointment has been booked:

          Name: ${updatedAppointment.name}
          Email: ${updatedAppointment.email}
          Start Time: ${startTime.toLocaleString()}
        `,
      );
    } catch (error) {
      console.error('Failed to send notification email to admin:', error);
    }

    return { message: 'Appointment booked and calendar event created.' };
  }
}

