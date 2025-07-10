import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentService } from 'src/appointment/appointment.service';
import Stripe from 'stripe';
import { CreateCheckoutSessionDto } from './dto/create-payment.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private appointmentService: AppointmentService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY || this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    this.stripe = new Stripe(secretKey, { apiVersion: '2025-05-28.basil' });
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    const { slotId, name, email } = dto;

    try {
      // Verify slot availability
      const appointment = await this.appointmentService.getSlotDetails(slotId);
      if (!appointment || appointment.isBooked) {
        throw new BadRequestException('Slot is not available for booking');
      }

      // Create Stripe checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Appointment Booking`,
                description: `Appointment slot: ${appointment.startTime.toLocaleString()}`,
                metadata: {
                  slotId: slotId.toString(),
                  name,
                  email,
                },
              },
              unit_amount: 5000, // $50.00 in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.configService.get<string>('FRONTEND_URL')}/?payment=success`,
        cancel_url: `${this.configService.get<string>('FRONTEND_URL')}/payment-cancel`,
        metadata: {
          slotId: slotId.toString(),
          name,
          email,
        },
        customer_creation: 'always',
        billing_address_collection: 'required',
      });

      this.logger.log(`Checkout session created for slot ${slotId} by ${email}`);
      return {
        sessionId: session.id,
        url: session.url,
        amount: session.amount_total,
        currency: session.currency,
      };
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`);
      throw new BadRequestException('Failed to create payment session');
    }
  }

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    this.logger.log('Webhook endpoint hit!');
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!sig || !endpointSecret) {
      this.logger.error('Missing Stripe signature or endpoint secret');
      res.status(400).send('Missing Stripe signature or endpoint secret');
      return;
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    this.logger.log(`Received webhook event: ${event.type}`);

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const name = metadata['name'];
        const email = metadata['email'];
        const slotId = metadata['slotId'];
        if (!name || !email || !slotId) {
          this.logger.error('Missing metadata in checkout session');
          res.status(400).send('Missing metadata in session');
          return;
        }
        await this.appointmentService.bookAppointment(parseInt(slotId, 10), name, email);
        this.logger.log(`✅ Appointment booked successfully for ${name} (${email})`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      res.status(500).send('Webhook processing failed');
      return;
    }

    this.logger.log('Webhook handler finished, sending response');
    res.status(200).json({ received: true });
  }
}