/**
 * Notification Job
 * Handles scheduled notifications and reminders
 * @module jobs/notification.job
 */

import cron from 'node-cron';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

cron.schedule('0 9 * * *', async () => {
  console.log('Running morning notification job...');

  try {
    const users = await User.find({ isActive: true, role: 'customer' }).limit(100);
    
    const notifications = users.map(user => ({
      user: user._id,
      type: 'general',
      title: 'Good Morning!',
      message: 'Start your day with delicious food from Okados!',
    }));

    await Notification.insertMany(notifications);
    console.log(`Sent morning notifications to ${notifications.length} users`);
  } catch (error) {
    console.error('Morning notification error:', error);
  }
});

cron.schedule('0 12 * * *', async () => {
  console.log('Running lunch reminder job...');

  try {
    const users = await User.find({ isActive: true, role: 'customer' }).limit(100);
    
    const notifications = users.map(user => ({
      user: user._id,
      type: 'general',
      title: 'Lunch Time!',
      message: 'Hungry? Order your favorite lunch now!',
    }));

    await Notification.insertMany(notifications);
    console.log(`Sent lunch reminders to ${notifications.length} users`);
  } catch (error) {
    console.error('Lunch reminder error:', error);
  }
});

cron.schedule('0 19 * * *', async () => {
  console.log('Running dinner reminder job...');

  try {
    const users = await User.find({ isActive: true, role: 'customer' }).limit(100);
    
    const notifications = users.map(user => ({
      user: user._id,
      type: 'general',
      title: 'Dinner Time!',
      message: 'Enjoy dinner with your family. Order now!',
    }));

    await Notification.insertMany(notifications);
    console.log(`Sent dinner reminders to ${notifications.length} users`);
  } catch (error) {
    console.error('Dinner reminder error:', error);
  }
});

cron.schedule('0 0 * * 0', async () => {
  console.log('Running weekly summary job...');

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const users = await User.find({ isActive: true, role: 'customer' }).limit(100);

    for (const user of users) {
      const weeklyNotifications = await Notification.countDocuments({
        user: user._id,
        createdAt: { $gte: sevenDaysAgo },
      });

      if (weeklyNotifications > 0) {
        await Notification.create({
          user: user._id,
          type: 'general',
          title: 'Your Weekly Summary',
          message: `You have ${weeklyNotifications} notifications this week. Check them out!`,
        });
      }
    }

    console.log('Weekly summaries sent');
  } catch (error) {
    console.error('Weekly summary error:', error);
  }
});

export default {};
