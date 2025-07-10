import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCheckoutSessionDto {
  slotId: number;
  name: string;
  email: string;
}

export class PaymentIntentDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
