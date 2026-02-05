const schedule = require('node-schedule');
const log = require('electron-log');

/**
 * Scheduler Service - Handles background case updates and notifications
 */
class SchedulerService {
  constructor(db, ecourtsService, notificationCallback) {
    this.db = db;
    this.ecourtsService = ecourtsService;
    this.showNotification = notificationCallback;
    this.jobs = [];
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    log.info('Starting scheduler service...');

    // Daily case status refresh at 9 AM
    this.jobs.push(
      schedule.scheduleJob('0 9 * * *', () => this.dailyRefresh())
    );

    // Check for upcoming hearings every day at 8 AM
    this.jobs.push(
      schedule.scheduleJob('0 8 * * *', () => this.checkUpcomingHearings())
    );

    // Hourly light refresh for high priority cases
    this.jobs.push(
      schedule.scheduleJob('0 * * * *', () => this.refreshHighPriorityCases())
    );

    log.info('Scheduler service started with', this.jobs.length, 'jobs');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    log.info('Stopping scheduler service...');
    this.jobs.forEach(job => job.cancel());
    this.jobs = [];
  }

  /**
   * Daily refresh of all cases
   */
  async dailyRefresh() {
    log.info('Running daily case refresh...');

    try {
      const cases = this.db.getAllCases();
      let updated = 0;

      for (const caseItem of cases) {
        try {
          await this.ecourtsService.fetchCaseStatus(caseItem);
          updated++;
          // Add small delay between requests
          await this.sleep(2000);
        } catch (error) {
          log.error(`Error updating case ${caseItem.case_number}:`, error);
        }
      }

      this.showNotification(
        'Daily Refresh Complete',
        `Updated ${updated} of ${cases.length} cases`
      );

      log.info(`Daily refresh complete: ${updated}/${cases.length} cases updated`);
    } catch (error) {
      log.error('Daily refresh error:', error);
    }
  }

  /**
   * Check for upcoming hearings and send reminders
   */
  async checkUpcomingHearings() {
    log.info('Checking for upcoming hearings...');

    try {
      // Get hearings in next 7 days
      const hearings = this.db.getUpcomingHearings(7);

      // Filter for today and tomorrow
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const todayHearings = hearings.filter(h => h.hearing_date === today);
      const tomorrowHearings = hearings.filter(h => h.hearing_date === tomorrow);

      // Send notifications
      if (todayHearings.length > 0) {
        this.showNotification(
          'Hearings Today',
          `You have ${todayHearings.length} hearing(s) scheduled for today`
        );
      }

      if (tomorrowHearings.length > 0) {
        this.showNotification(
          'Hearings Tomorrow',
          `You have ${tomorrowHearings.length} hearing(s) scheduled for tomorrow`
        );
      }

      log.info(`Upcoming hearings: Today=${todayHearings.length}, Tomorrow=${tomorrowHearings.length}`);
    } catch (error) {
      log.error('Error checking upcoming hearings:', error);
    }
  }

  /**
   * Refresh high priority cases more frequently
   */
  async refreshHighPriorityCases() {
    log.info('Refreshing high priority cases...');

    try {
      const allCases = this.db.getAllCases();
      const highPriorityCases = allCases.filter(c => c.priority === 'high');

      for (const caseItem of highPriorityCases) {
        try {
          await this.ecourtsService.fetchCaseStatus(caseItem);
          await this.sleep(2000);
        } catch (error) {
          log.error(`Error refreshing high priority case ${caseItem.case_number}:`, error);
        }
      }

      log.info(`Refreshed ${highPriorityCases.length} high priority cases`);
    } catch (error) {
      log.error('Error refreshing high priority cases:', error);
    }
  }

  /**
   * Check for new orders
   */
  async checkForNewOrders() {
    log.info('Checking for new orders...');

    try {
      const cases = this.db.getAllCases();
      let newOrdersCount = 0;

      for (const caseItem of cases) {
        try {
          const result = await this.ecourtsService.fetchCaseOrders(caseItem);
          if (result.success && result.orders && result.orders.length > 0) {
            // Check for orders that aren't in the database yet
            const existingOrders = this.db.getCaseOrders(caseItem.id);
            const existingDates = existingOrders.map(o => o.order_date);

            for (const order of result.orders) {
              if (!existingDates.includes(order.order_date)) {
                this.db.addOrder({
                  case_id: caseItem.id,
                  ...order
                });
                newOrdersCount++;
              }
            }
          }
          await this.sleep(2000);
        } catch (error) {
          log.error(`Error checking orders for ${caseItem.case_number}:`, error);
        }
      }

      if (newOrdersCount > 0) {
        this.showNotification(
          'New Orders Found',
          `${newOrdersCount} new order(s) have been added to your cases`
        );
      }

      log.info(`Found ${newOrdersCount} new orders`);
    } catch (error) {
      log.error('Error checking for new orders:', error);
    }
  }

  /**
   * Helper to add delay between requests
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual trigger for full refresh
   */
  async triggerFullRefresh() {
    return this.dailyRefresh();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.jobs.length > 0,
      jobCount: this.jobs.length,
      nextRun: this.jobs[0]?.nextInvocation() || null
    };
  }
}

module.exports = SchedulerService;
