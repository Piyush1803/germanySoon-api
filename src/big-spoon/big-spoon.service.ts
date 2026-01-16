import { Injectable } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { QuoteRequestDto } from './dto/quote-request.dto';

@Injectable()
export class BigSpoonService {
  constructor(private readonly mailService: MailService) {}

  async handleQuoteRequest(data: QuoteRequestDto) {
    const adminEmail = 'biggspoon.india@gmail.com';

    const adminSubject = 'New quote request from Big Spoon website';
    const adminText = `A new quote request has been submitted.\n
Name: ${data.name}
Email: ${data.email}
Company: ${data.company}
Employees: ${data.employees ?? 'N/A'}
Phone: ${data.phone}
Message: ${data.message ?? 'N/A'}
`;

    await this.mailService.sendBigSpoonMail(adminEmail, adminSubject, adminText);

    const userSubject = 'Your quote request has been received';
    const userText = `Hi ${data.name},

Your request has been submitted successfully. Our team will contact you shortly with more details.

Best regards,
Big Spoon Team`;

    if (data.email) {
      await this.mailService.sendBigSpoonMail(data.email, userSubject, userText);
    }
  }
}
