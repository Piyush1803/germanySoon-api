import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import Stripe from 'stripe';
import { ServerApiVersion } from 'typeorm';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe('STRIPE_SECRET_KEY');
  }

async createCheckoutSession(amount: number, customerEmail: string) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Consultation Appointment',
            },
            unit_amount: amount * 100, // e.g., $10 => 1000
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      success_url: 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel',
    });

    return { url: session.url };
  }
}