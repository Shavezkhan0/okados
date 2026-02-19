import Razorpay from 'razorpay';
import crypto from 'crypto';

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
    });
    this.isConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  }

  async createRazorpayOrder(orderId, amount, currency = 'INR', notes = {}) {
    try {
      if (!this.isConfigured) {
        console.log('[PAYMENT SERVICE] Running in mock mode');
        return {
          success: true,
          mock: true,
          id: `mock_order_${Date.now()}`,
          amount: Math.round(amount * 100),
          currency,
          receipt: orderId,
        };
      }

      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt: orderId,
        payment_capture: 1,
        notes: { orderId, ...notes },
      };

      const order = await this.razorpay.orders.create(options);
      
      console.log('[PAYMENT SERVICE] Razorpay order created', { orderId, razorpayOrderId: order.id });

      return {
        success: true,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      console.error('[PAYMENT SERVICE] Create order error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      if (!this.isConfigured) {
        console.log('[PAYMENT SERVICE] Mock payment verification');
        return { success: true, verified: true, mock: true };
      }

      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === razorpaySignature;

      console.log('[PAYMENT SERVICE] Payment verification', {
        razorpayOrderId,
        razorpayPaymentId,
        isValid,
      });

      if (!isValid) {
        console.warn('[PAYMENT SERVICE] Invalid payment signature detected!');
      }

      return { success: true, verified: isValid };
    } catch (error) {
      console.error('[PAYMENT SERVICE] Verify payment error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async initiateRefund(paymentId, amount, reason = '', speed = 'normal') {
    try {
      if (!this.isConfigured) {
        console.log('[PAYMENT SERVICE] Mock refund');
        return {
          success: true,
          mock: true,
          id: `mock_refund_${Date.now()}`,
          status: 'processed',
          amount: Math.round(amount * 100),
        };
      }

      const refundOptions = {
        payment_id: paymentId,
        amount: Math.round(amount * 100),
        speed,
        notes: { reason },
      };

      const refund = await this.razorpay.refunds.create(refundOptions);

      console.log('[PAYMENT SERVICE] Refund initiated', {
        paymentId,
        refundId: refund.id,
        amount: refund.amount,
      });

      return {
        success: true,
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        speed: refund.speed,
      };
    } catch (error) {
      console.error('[PAYMENT SERVICE] Refund error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getPaymentDetails(paymentId) {
    try {
      if (!this.isConfigured) {
        return {
          success: true,
          mock: true,
          payment: {
            id: paymentId,
            amount: 0,
            currency: 'INR',
            status: 'captured',
          },
        };
      }

      const payment = await this.razorpay.payments.fetch(paymentId);

      return {
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          capturedAt: payment.captured_at,
          errorCode: payment.error_code,
          errorDescription: payment.error_description,
        },
      };
    } catch (error) {
      console.error('[PAYMENT SERVICE] Get payment details error:', error.message);
      return { success: false, error: error.message };
    }
  }

  verifyWebhookSignature(payload, signature) {
    try {
      if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
        console.log('[PAYMENT SERVICE] Webhook secret not configured');
        return true;
      }

      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      console.log('[PAYMENT SERVICE] Webhook signature verification', { isValid });

      return isValid;
    } catch (error) {
      console.error('[PAYMENT SERVICE] Webhook verification error:', error.message);
      return false;
    }
  }

  async createOrder(amount, currency, receipt) {
    return this.createRazorpayOrder(receipt, amount, currency);
  }

  async refundPayment(paymentId, amount, speed) {
    return this.initiateRefund(paymentId, amount, '', speed);
  }

  async refund(paymentId, amount) {
    return this.initiateRefund(paymentId, amount);
  }

  async getOrderDetails(razorpayOrderId) {
    try {
      if (!this.isConfigured) {
        return { success: true, mock: true };
      }

      const order = await this.razorpay.orders.fetch(razorpayOrderId);
      return { success: true, order };
    } catch (error) {
      console.error('[PAYMENT SERVICE] Get order details error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new PaymentService();
