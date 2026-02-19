/**
 * SMS Service
 * Handles SMS notifications using Twilio or MSG91
 * @module services/sms.service
 */

import axios from 'axios';

const logger = {
  info: (message, meta = {}) => console.log(`[SMS SERVICE] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[SMS SERVICE ERROR] ${message}`, meta),
};

class SmsService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'twilio';
    this.isConfigured = !!(process.env.TWILIO_ACCOUNT_SID || process.env.MSG91_AUTH_KEY);
    this.senderId = process.env.SMS_SENDER_ID || 'OKADOS';
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    let formatted = phone.replace(/\s+/g, '');
    
    if (formatted.startsWith('+')) {
      return formatted;
    }
    
    if (formatted.startsWith('91') && formatted.length > 10) {
      return `+${formatted}`;
    }
    
    if (formatted.length === 10) {
      return `+91${formatted}`;
    }
    
    return `+${formatted}`;
  }

  async sendSMS(to, message) {
    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      if (!formattedPhone) {
        logger.error('Invalid phone number', { to });
        return { success: false, error: 'Invalid phone number' };
      }

      if (!this.isConfigured) {
        logger.warn('SMS not configured, logging instead', { to: formattedPhone, message });
        return { success: true, mock: true, to: formattedPhone, message };
      }

      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(formattedPhone, message);
      } else if (this.provider === 'msg91') {
        return await this.sendViaMsg91(formattedPhone, message);
      } else {
        return await this.sendViaTwilio(formattedPhone, message);
      }
    } catch (error) {
      logger.error('SMS sending error', { error: error.message, to });
      return { success: false, error: error.message };
    }
  }

  async sendViaTwilio(to, message) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64');

    const response = await axios.post(
      url,
      new URLSearchParams({
        To: to,
        From: process.env.TWILIO_PHONE_NUMBER || this.senderId,
        Body: message,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    logger.info('SMS sent via Twilio', { to, sid: response.data.sid });
    return { success: true, sid: response.data.sid, to };
  }

  async sendViaMsg91(to, message) {
    const url = `https://api.msg91.com/api/v5/sendsms`;
    
    const response = await axios.post(
      url,
      new URLSearchParams({
        authkey: process.env.MSG91_AUTH_KEY,
        mobiles: to.replace('+', ''),
        message: message,
        sender: this.senderId,
        route: '4',
        country: '91',
      })
    );

    logger.info('SMS sent via MSG91', { to, response: response.data });
    return { success: true, response: response.data, to };
  }

  async sendOTP(phone, otp, purpose = 'verification') {
    let message;
    
    if (purpose === 'verification') {
      message = `Your Okados verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    } else if (purpose === 'login') {
      message = `Your Okados login OTP is: ${otp}. Valid for 10 minutes.`;
    } else {
      message = `Your Okados OTP is: ${otp}. Valid for 10 minutes.`;
    }

    return this.sendSMS(phone, message);
  }

  async sendOrderOTP(phone, otp) {
    const message = `Your Okados verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS(phone, message);
  }

  async sendOrderStatusUpdate(phone, orderNumber, status) {
    const templates = {
      placed: `Your order #${orderNumber} has been placed successfully. We'll notify you once confirmed.`,
      confirmed: `Your order #${orderNumber} has been confirmed by the restaurant.`,
      preparing: `Your order #${orderNumber} is being prepared. Hang tight!`,
      ready: `Your order #${orderNumber} is ready for pickup!`,
      picked_up: `Your order #${orderNumber} has been picked up. On the way!`,
      on_way: `Your order #${orderNumber} is on its way! Track in app.`,
      delivered: `Your order #${orderNumber} has been delivered. Enjoy your meal! Rate us on the app.`,
      cancelled: `Your order #${orderNumber} has been cancelled. Sorry for the inconvenience.`,
    };

    const message = templates[status] || `Order #${orderNumber} update: ${status}`;
    return this.sendSMS(phone, message);
  }

  async sendDeliveryOTP(phone, otp, orderNumber) {
    const message = `Your delivery OTP for order #${orderNumber} is: ${otp}. Share this with the delivery partner to complete delivery.`;
    return this.sendSMS(phone, message);
  }

  async sendPaymentNotification(phone, orderNumber, amount, status) {
    const templates = {
      pending: `Payment of ₹${amount} pending for order #${orderNumber}. Please complete payment to confirm your order.`,
      completed: `Payment of ₹${amount} received for order #${orderNumber}. Thank you!`,
      failed: `Payment failed for order #${orderNumber}. Please try again.`,
      refunded: `Payment of ₹${amount} has been refunded for order #${orderNumber}.`,
    };

    const message = templates[status] || `Payment update for order #${orderNumber}: ₹${amount} - ${status}`;
    return this.sendSMS(phone, message);
  }

  async sendPromotionalSMS(phone, offer) {
    const message = offer.description 
      ? `${offer.title}: ${offer.description}. Use code: ${offer.code}. Valid till ${new Date(offer.expiresAt).toLocaleDateString()}. - Okados`
      : `${offer.title}! Use code ${offer.code} to avail offer. Valid till ${new Date(offer.expiresAt).toLocaleDateString()}. - Okados`;
    
    return this.sendSMS(phone, message);
  }

  async sendBulkSMS(phones, message) {
    const results = {
      total: phones.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const phone of phones) {
      try {
        const result = await this.sendSMS(phone, message);
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({ phone, error: result.error });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ phone, error: error.message });
      }
    }

    logger.info('Bulk SMS completed', results);
    return results;
  }

  async scheduleSMS(phone, message, scheduledTime) {
    logger.info('Scheduling SMS', { phone, scheduledTime });
    
    return {
      success: true,
      scheduled: true,
      phone,
      scheduledTime: scheduledTime.toISOString(),
      message,
    };
  }

  async verifyPhoneNumber(phone) {
    const formattedPhone = this.formatPhoneNumber(phone);
    
    if (!formattedPhone) {
      return { valid: false, formatted: null };
    }

    try {
      if (this.provider === 'twilio' && this.isConfigured) {
        const url = `https://lookups.twilio.com/v2/PhoneNumbers/${formattedPhone}`;
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64');

        const response = await axios.get(url, {
          headers: { Authorization: `Basic ${auth}` },
        });

        return {
          valid: response.data.valid,
          formatted: response.data.phoneNumber,
          countryCode: response.data.countryCode,
          carrier: response.data.carrier,
        };
      }
      
      return { valid: true, formatted: formattedPhone };
    } catch (error) {
      logger.error('Phone verification error', { error: error.message });
      return { valid: true, formatted: formattedPhone, verified: false };
    }
  }

  getSenderId() {
    return this.senderId;
  }

  isSMSConfigured() {
    return this.isConfigured;
  }
}

export default new SmsService();
