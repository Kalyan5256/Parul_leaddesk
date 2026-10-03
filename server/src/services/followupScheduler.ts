import cron from 'node-cron';
import { dbStore } from '../db/store.js';
import { sendPushNotification } from '../lib/push.js';

let cronTask: ReturnType<typeof cron.schedule> | null = null;
let isDispatching = false;

export interface DispatchResult {
  processed: number;
  successCount: number;
  failedCount: number;
  timestamp: string;
}

export const dispatchDueFollowUps = async (): Promise<DispatchResult> => {
  if (isDispatching) {
    return {
      processed: 0,
      successCount: 0,
      failedCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  isDispatching = true;
  let processed = 0;
  let successCount = 0;
  let failedCount = 0;

  try {
    const dueFollowUps = await dbStore.getDueFollowUpsIST();
    processed = dueFollowUps.length;

    for (const item of dueFollowUps) {
      const { followUp, lead } = item;

      // 1. Mark as notified immediately to prevent duplicate runs
      await dbStore.markFollowUpNotified(followUp.id);

      const timeDisplay = followUp.follow_up_time
        ? followUp.follow_up_time.slice(0, 5)
        : 'Today';

      const title = `📞 Follow-Up Due: ${lead.lead_name}`;
      const body = `Scheduled at ${timeDisplay} IST for ${lead.course} (Ph: ${lead.mobile}). ${followUp.note || 'Review lead profile.'}`;
      const link = '/follow-ups';

      // 2. Always create an in-app notification (persisted in DB)
      try {
        await dbStore.addNotification({
          user_id: followUp.employee_id,
          title,
          body,
          type: 'followup_due',
          link,
        });
      } catch (notifErr) {
        console.warn(`[Scheduler] Could not save in-app notification for user ${followUp.employee_id}:`, notifErr);
      }

      // 3. Send Web Push to all registered device subscriptions for this user
      try {
        const subscriptions = await dbStore.getPushSubscriptionsForUser(followUp.employee_id);
        if (subscriptions.length > 0) {
          const pushPromises = subscriptions.map((sub) =>
            sendPushNotification(sub, {
              title,
              body,
              url: link,
              tag: `followup-${followUp.id}`,
              data: {
                leadId: lead.id,
                followUpId: followUp.id,
                mobile: lead.mobile,
              },
            })
          );
          await Promise.all(pushPromises);
          successCount++;
        }
      } catch (pushErr) {
        console.warn(`[Scheduler] Push notification dispatch failed for follow-up ${followUp.id}:`, pushErr);
        failedCount++;
      }
    }

    if (processed > 0) {
      console.log(`[Scheduler] Dispatched notifications for ${processed} due follow-ups (IST).`);
    }
  } catch (err) {
    console.error('[Scheduler Error] Failed checking due follow-ups:', err);
  } finally {
    isDispatching = false;
  }

  return {
    processed,
    successCount,
    failedCount,
    timestamp: new Date().toISOString(),
  };
};

export const startFollowUpScheduler = (): void => {
  if (cronTask) {
    console.log('[Scheduler] Follow-up cron scheduler is already running.');
    return;
  }

  // Run every minute: checks IST follow-ups due right now
  cronTask = cron.schedule('* * * * *', async () => {
    await dispatchDueFollowUps();
  });

  console.log('⏰ Follow-up push notification scheduler initialized (running every 60s in IST)');
};

export const stopFollowUpScheduler = (): void => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Scheduler] Follow-up scheduler stopped.');
  }
};
