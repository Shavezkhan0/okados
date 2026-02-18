/**
 * Email Service
 * Handles all email operations using Nodemailer
 * @module services/email.service
 */

const nodemailer = require('nodemailer');
const logger = {
  info: (message, meta = {}) => console.log(`[EMAIL SERVICE] ${message}`, meta),
  error: (message, meta = {}) => console.error(`[EMAIL SERVICE ERROR] ${message}`, meta),
};

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.isConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    this.fromAddress = process.env.SMTP_FROM || 'Okados <noreply@okados.com>';
  }

  async sendEmail(to, subject, html, text = '', attachments = []) {
    try {
      if (!this.isConfigured) {
        logger.warn('Email not configured, logging instead', { to, subject });
        return { success: true, mock: true, to, subject };
      }

      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        attachments,
      });

      logger.info('Email sent', { messageId: info.messageId, to, subject });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email sending error', { error: error.message, to, subject });
      return { success: false, error: error.message };
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\n+/g, ' ')
      .trim();
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Okados!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Okados!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Thank you for joining Okados! We're thrilled to have you on board.</p>
            <p>With Okados, you can:</p>
            <ul>
              <li>Browse restaurants near you</li>
              <li>Order your favorite food</li>
              <li>Track orders in real-time</li>
              <li>Enjoy exclusive offers</li>
            </ul>
            ${user.referralCode ? `<p>Your Referral Code: <strong>${user.referralCode}</strong></p>` : ''}
            <p>Start exploring now!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendOrderConfirmationEmail(order, user) {
    const subject = `Order Confirmed - #${order.orderNumber}`;
    const itemsList = order.items.map(item => 
      `<li>${item.name} x${item.quantity} - ₹${item.subtotal}</li>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-details { background: #f9f9f9; padding: 15px; margin: 15px 0; }
          .items { margin: 15px 0; }
          .total { font-size: 18px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Your order has been confirmed and is being processed.</p>
            
            <div class="order-details">
              <h3>Order #${order.orderNumber}</h3>
              <p><strong>Restaurant:</strong> ${order.restaurantId?.name || 'N/A'}</p>
              <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryTime).toLocaleString()}</p>
            </div>

            <div class="items">
              <h4>Order Items:</h4>
              <ul>${itemsList}</ul>
            </div>

            <div class="total">
              <p>Total: ₹${order.pricing?.grandTotal || order.total}</p>
            </div>

            <p>We'll notify you when your order is on its way!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendOrderStatusEmail(order, user, status) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed by the restaurant.',
      preparing: 'Your order is being prepared.',
      ready: 'Your order is ready for pickup!',
      dispatched: 'Your order is on its way!',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'Your order has been cancelled.',
    };

    const subject = `Order #${order.orderNumber} - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status { font-size: 24px; font-weight: bold; color: #ff6b35; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Update</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p class="status">${statusMessages[status] || 'Your order status has been updated.'}</p>
            <p>Order #${order.orderNumber}</p>
            <p>Thank you for ordering with Okados!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPaymentReceiptEmail(order, user) {
    const subject = `Payment Receipt - #${order.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .receipt { background: #f9f9f9; padding: 15px; margin: 15px 0; }
          .total { font-size: 18px; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful! ✅</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Your payment has been processed successfully.</p>
            
            <div class="receipt">
              <h3>Payment Receipt</h3>
              <p><strong>Order Number:</strong> ${order.orderNumber}</p>
              <p><strong>Amount Paid:</strong> ₹${order.pricing?.grandTotal || order.total}</p>
              <p><strong>Payment Method:</strong> ${order.payment?.method === 'online' ? 'Online' : 'Cash on Delivery'}</p>
              <p><strong>Transaction ID:</strong> ${order.payment?.transactionId || 'N/A'}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>Thank you for your purchase!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Reset Your Okados Password';
    const resetUrl = `${process.env.USER_APP_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; padding: 10px; border-radius: 5px; font-size: 14px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Password</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link in your browser:</p>
            <p>${resetUrl}</p>
            
            <div class="warning">
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendOTPEmail(user, otp, purpose = 'verification') {
    const subject = purpose === 'verification' 
      ? 'Your Okados Verification Code' 
      : 'Your Okados OTP';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; text-align: center; }
          .otp { font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #ff6b35; }
          .warning { background: #fff3cd; padding: 10px; border-radius: 5px; font-size: 14px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your ${purpose === 'verification' ? 'Account' : 'Identity'}</h1>
          </div>
          <div class="content">
            <p>Your verification code is:</p>
            <p class="otp">${otp}</p>
            <p>This code expires in 10 minutes.</p>
            
            <div class="warning">
              <p>Never share this code with anyone.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendRestaurantApprovalEmail(restaurant, isApproved) {
    const subject = isApproved 
      ? 'Your Restaurant is Now Live on Okados! 🎉' 
      : 'Restaurant Application Update';
    
    const html = isApproved ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .steps { background: #f9f9f9; padding: 15px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Congratulations! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${restaurant.name},</p>
            <p>Great news! Your restaurant has been approved and is now live on Okados.</p>
            
            <div class="steps">
              <h3>Next Steps:</h3>
              <ol>
                <li>Add your menu items</li>
                <li>Set your operating hours</li>
                <li>Configure delivery settings</li>
                <li>Start receiving orders!</li>
              </ol>
            </div>
            
            <p>Log in to your dashboard to get started.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <p>Hi ${restaurant.name},</p>
            <p>Thank you for your interest in joining Okados.</p>
            <p>Unfortunately, your restaurant application was not approved at this time.</p>
            <p>For more information, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const owner = await require('../models/User').findById(restaurant.ownerId);
    if (owner?.email) {
      return this.sendEmail(owner.email, subject, html);
    }
    return { success: false, error: 'Owner email not found' };
  }

  async sendWeeklyReportEmail(restaurant, stats) {
    const subject = `Your Weekly Report - ${stats.week}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat-card { background: #f9f9f9; padding: 15px; text-align: center; border-radius: 8px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #ff6b35; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Report 📊</h1>
          </div>
          <div class="content">
            <p>Hi ${restaurant.name},</p>
            <p>Here's your performance summary for this week:</p>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${stats.totalOrders}</div>
                <div>Total Orders</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">₹${stats.totalRevenue}</div>
                <div>Revenue</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">₹${stats.averageOrderValue}</div>
                <div>Avg Order Value</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.rating || 'N/A'}</div>
                <div>Rating</div>
              </div>
            </div>
            
            <p>Keep up the great work!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const owner = await require('../models/User').findById(restaurant.ownerId);
    if (owner?.email) {
      return this.sendEmail(owner.email, subject, html);
    }
    return { success: false, error: 'Owner email not found' };
  }

  async sendPromotionalEmail(user, offer) {
    const subject = offer.subject || `Special Offer: ${offer.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .offer { background: #fff3cd; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
          .offer-code { font-size: 24px; font-weight: bold; color: #ff6b35; }
          .button { display: inline-block; padding: 12px 24px; background: #ff6b35; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${offer.title} 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>${offer.description}</p>
            
            <div class="offer">
              ${offer.discount ? `<p>Get ${offer.discount}% OFF!</p>` : ''}
              ${offer.code ? `<p class="offer-code">${offer.code}</p>` : ''}
            </div>
            
            <a href="${process.env.USER_APP_URL}/restaurants" class="button">Order Now</a>
            
            <p><small>Offer valid until ${new Date(offer.expiresAt).toLocaleDateString()}</small></p>
          </div>
          <div class="footer">
            <p>Thank you for being a valued customer!</p>
            <p>&copy; ${new Date().getFullYear()} Okados. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendBulkEmails(recipients, subject, html) {
    const results = {
      total: recipients.length,
      successful: 0,
      failed: 0,
    };

    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient.email, subject, html);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
    }

    return results;
  }
}

module.exports = new EmailService();
