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

  private bigSpoonTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'biggspoon.india@gmail.com',
      pass: '' // TODO: Add app password here
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

  async sendBigSpoonMail(to: string, subject: string, text: string) {
    const mailOption = {
      from: '"Big Spoon" <biggspoon.india@gmail.com>',
      to,
      subject,
      text,
    };
    return await this.bigSpoonTransporter.sendMail(mailOption);
  }
}
