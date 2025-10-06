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
    this.stripe = new Stripe(secretKey);
  }

  private getNormalizedFrontendUrl(): string {
    const raw = (this.configService.get<string>('FRONTEND_URL') || '').trim();
    let value = raw.length > 0 ? raw : 'https://germanysoon.com';

    // Handle scheme-relative URLs like //example.com
    if (/^\/\//.test(value)) {
      value = `https:${value}`;
    }
    // Fix malformed schemes like "https:example.com" or "https:germanysoon.com"
    if (/^https?:[^/]/i.test(value)) {
      value = value.replace(/^https?:/i, 'https://');
    }
    // Ensure a scheme exists
    if (!/^https?:\/\//i.test(value)) {
      value = `https://${value}`;
    }
    // Collapse accidental double scheme if present
    value = value.replace(/^(https?:\/\/)(https?:\/\/)+/i, '$1');
    // Remove trailing slash (but keep "https://domain" intact)
    if (value.endsWith('/') && !/^https?:\/\/$/i.test(value)) {
      value = value.slice(0, -1);
    }
    return value;
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
      const baseFrontendUrl = this.getNormalizedFrontendUrl();
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
              unit_amount: 5000,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseFrontendUrl}/?payment=success`,
        cancel_url: `${baseFrontendUrl}/payment-cancel`,
        metadata: {
          slotId: slotId.toString(),
          name,
          email,
        },
        customer_creation: 'always',
        billing_address_collection: 'required',
      });

      this.logger.log(
        `Checkout session created for slot ${slotId} by ${email}. success_url=${baseFrontendUrl}/?payment=success, cancel_url=${baseFrontendUrl}/payment-cancel`,
      );
      return {
        sessionId: session.id,
        url: session.url,
        amount: session.amount_total,
        currency: session.currency,
      };
    } catch (error) {
      const asAny = error as any;
      const stripeMessage = asAny?.raw?.message || asAny?.message || 'Unknown error';
      const stripeParam = asAny?.raw?.param;
      const stripeCode = asAny?.raw?.code;
      this.logger.error(`Error creating checkout session: message=${stripeMessage} code=${stripeCode ?? 'n/a'} param=${stripeParam ?? 'n/a'}`);
      throw new BadRequestException(stripeMessage || 'Failed to create payment session');
    }
  }

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    this.logger.log('Webhook endpoint hit!');
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!sig || !endpointSecret) {
      this.logger.error(`Missing Stripe signature or endpoint secret. hasSig=${Boolean(sig)} hasSecret=${Boolean(endpointSecret)}`);
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

    this.logger.log(`Received webhook event: ${event.type} id=${event.id}`);

    try {
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        // Retrieve the latest session to confirm status
        const latestSession = await this.stripe.checkout.sessions.retrieve(sessionId);
        const paymentStatus = latestSession.payment_status;
        this.logger.log(`Checkout session ${sessionId} payment_status=${paymentStatus}`);

        if (paymentStatus !== 'paid') {
          this.logger.warn(`Skipping booking for session ${sessionId} because payment_status=${paymentStatus}`);
          res.status(200).json({ received: true, skipped: true });
          return;
        }

        const metadata = latestSession.metadata || {};
        const name = metadata['name'];
        const email = metadata['email'];
        const slotId = metadata['slotId'];
        this.logger.log(`Extracted metadata for session ${sessionId}: name=${name ?? 'n/a'} email=${email ?? 'n/a'} slotId=${slotId ?? 'n/a'}`);
        if (!name || !email || !slotId) {
          this.logger.error(`Missing metadata in checkout session ${sessionId}`);
          res.status(400).send('Missing metadata in session');
          return;
        }

        try {
          await this.appointmentService.bookAppointment(parseInt(slotId, 10), name, email);
          this.logger.log(`✅ Appointment booked successfully for ${name} (${email}) [slotId=${slotId}]`);
        } catch (bookingError: any) {
          this.logger.error(`Booking failed for slotId=${slotId}: ${bookingError?.message ?? bookingError}`);
          res.status(500).send('Booking failed');
          return;
        }
      } else if (event.type === 'payment_intent.succeeded') {
        // Fallback handler if Stripe sends payment_intent.succeeded instead of checkout.session.completed
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = paymentIntent.id;
        this.logger.log(`Handling payment_intent.succeeded for ${paymentIntentId}`);

        // Find the checkout session associated with this payment intent
        const sessions = await this.stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
        if (!sessions.data.length) {
          this.logger.warn(`No checkout session found for payment_intent ${paymentIntentId}`);
          res.status(200).json({ received: true, skipped: true });
          return;
        }

        const session = sessions.data[0];
        const paymentStatus = session.payment_status;
        this.logger.log(`Derived session ${session.id} from payment_intent ${paymentIntentId} payment_status=${paymentStatus}`);
        if (paymentStatus !== 'paid') {
          this.logger.warn(`Skipping booking for session ${session.id} (from PI) because payment_status=${paymentStatus}`);
          res.status(200).json({ received: true, skipped: true });
          return;
        }

        const metadata = session.metadata || {};
        const name = metadata['name'];
        const email = metadata['email'];
        const slotId = metadata['slotId'];
        this.logger.log(`Extracted metadata from session ${session.id}: name=${name ?? 'n/a'} email=${email ?? 'n/a'} slotId=${slotId ?? 'n/a'}`);
        if (!name || !email || !slotId) {
          this.logger.error(`Missing metadata in session ${session.id} (from PI)`);
          res.status(400).send('Missing metadata in session');
          return;
        }

        try {
          await this.appointmentService.bookAppointment(parseInt(slotId, 10), name, email);
          this.logger.log(`✅ Appointment booked successfully for ${name} (${email}) [slotId=${slotId}] via payment_intent.succeeded`);
        } catch (bookingError: any) {
          this.logger.error(`Booking failed for slotId=${slotId} (from PI): ${bookingError?.message ?? bookingError}`);
          res.status(500).send('Booking failed');
          return;
        }
      } else {
        this.logger.log(`Unhandled event type: ${event.type}`);
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