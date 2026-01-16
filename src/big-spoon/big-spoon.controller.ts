import { Body, Controller, Post } from '@nestjs/common';
import { BigSpoonService } from './big-spoon.service';
import { QuoteRequestDto } from './dto/quote-request.dto';

@Controller('big-spoon')
export class BigSpoonController {
  constructor(private readonly bigSpoonService: BigSpoonService) {}

  @Post('request-quote')
  async requestQuote(@Body() body: QuoteRequestDto) {
    await this.bigSpoonService.handleQuoteRequest(body);
    return { message: 'Quote request submitted' };
  }
}