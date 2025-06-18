import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'germanysoon0@gmail.com',
      pass: 'ixcl sicp ufss ktkb'
    },
  });
  async sendMail(to: string, subject: string, text: string) {
    const mailOption = {
      from: '"Deutschland Horizon" <germanysoon0@gmail.com>',
      to,
      subject,
      text,
    };   
    return await this.transporter.sendMail(mailOption);
  }
}
