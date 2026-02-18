/**
 * Job Scheduler
 * @module jobs/index
 */

const cron = require('node-cron');

const startJobs = () => {
  console.log('Starting job scheduler...');

  require('./orderCleanup.job');
  require('./analytics.job');
  require('./notification.job');

  console.log('All jobs scheduled successfully');
};

module.exports = { startJobs };
