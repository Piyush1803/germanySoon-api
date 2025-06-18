import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post('event')
  async creatEvent(@Body() dto: CreateCalendarDto) {
    return this. calendarService.createEvent(dto);
  }
}
