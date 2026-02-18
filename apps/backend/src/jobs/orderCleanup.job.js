/**
 * Order Cleanup Job
 * Cleans up old pending orders and performs maintenance
 * @module jobs/orderCleanup.job
 */

const cron = require('node-cron');
const Order = require('../models/Order');

cron.schedule('0 0 * * *', async () => {
  console.log('Running order cleanup job...');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Order.deleteMany({
      status: { $in: ['pending', 'cancelled'] },
      createdAt: { $lt: thirtyDaysAgo },
    });

    console.log(`Cleaned up ${result.deletedCount} old orders`);
  } catch (error) {
    console.error('Order cleanup error:', error);
  }
});

cron.schedule('*/30 * * * *', async () => {
  console.log('Checking for stuck pending orders...');

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stuckOrders = await Order.find({
      status: 'pending',
      createdAt: { $lt: oneHourAgo },
    }).populate('user');

    for (const order of stuckOrders) {
      order.status = 'cancelled';
      order.cancellationReason = 'Auto-cancelled: Payment not received';
      await order.save();
      console.log(`Auto-cancelled stuck order: ${order.orderId}`);
    }

    console.log(`Processed ${stuckOrders.length} stuck orders`);
  } catch (error) {
    console.error('Stuck order check error:', error);
  }
});

module.exports = {};
