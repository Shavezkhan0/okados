/**
 * Job Scheduler
 * @module jobs/index
 */

import cron from 'node-cron';

const startJobs = () => {
  console.log('Starting job scheduler...');

  import('./orderCleanup.job.js');
  import('./analytics.job.js');
  import('./notification.job.js');

  console.log('All jobs scheduled successfully');
};

export { startJobs };
