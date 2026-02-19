/**
 * Analytics Job
 * Generates daily analytics and reports
 * @module jobs/analytics.job
 */

import cron from 'node-cron';
import analyticsService from '../services/analytics.service.js';
import Restaurant from '../models/Restaurant.js';

cron.schedule('0 1 * * *', async () => {
  console.log('Running daily analytics job...');

  try {
    await analyticsService.saveDailyAnalytics(null);
    console.log('Overall analytics saved');

    const restaurants = await Restaurant.find({ isActive: true });
    
    for (const restaurant of restaurants) {
      await analyticsService.saveDailyAnalytics(restaurant._id.toString());
    }

    console.log(`Analytics saved for ${restaurants.length} restaurants`);
  } catch (error) {
    console.error('Analytics job error:', error);
  }
});

cron.schedule('0 * * * *', async () => {
  console.log('Running hourly revenue analytics...');

  try {
    const analytics = await analyticsService.getDailyAnalytics(null, new Date());
    console.log('Hourly analytics:', analytics.orders);
  } catch (error) {
    console.error('Hourly analytics error:', error);
  }
});

export default {};
