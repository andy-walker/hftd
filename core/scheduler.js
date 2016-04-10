/**
 * Cron-like scheduler allowing components to schedule jobs
 * 'when' format:
 *   *    *    *    *    *    *
 *   ┬    ┬    ┬    ┬    ┬    ┬
 *   │    │    │    │    │    |
 *   │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
 *   │    │    │    │    └───── month (1 - 12)
 *   │    │    │    └────────── day of month (1 - 31)
 *   │    │    └─────────────── hour (0 - 23)
 *   │    └──────────────────── minute (0 - 59)
 *   └───────────────────────── second (0 - 59, OPTIONAL)
 */

var scheduler = function() {
	scheduler.schedule = require('node-schedule');
};

scheduler.prototype.addJob = function(when, what) {
    return scheduler.schedule.scheduleJob(when, what);
};

module.exports = function() {
    return new scheduler();
};