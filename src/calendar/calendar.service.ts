import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';
import { CreateCalendarDto } from './dto/create-calendar.dto';

@Injectable()
export class CalendarService {
  private calendar;
  private auth;

  constructor() {
    const keyFile = path.join(__dirname, '../../../src/keys/calendar-key.json');

    const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));

    this.auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  async createEvent(createCalendarDto: CreateCalendarDto) {
    const { summary, description, startTime, endTime } = createCalendarDto;

    const event = {
      summary,
      description,
      start: { dateTime: startTime, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime, timeZone: 'Asia/Kolkata' },
    };

    try{
      const response = await this.calendar.events.insert({
        calendarId: 'germanysoon0@gmail.com',
        requestBody: event,
      });
      return {
        status: 'success',
        eventLink: response.data.htmlLink,
      };
    }catch (error) {
      console.error('Failed to create calendar event:',error);
      throw new Error('Failed to create Google Calendar event.');
    }
  }
}
