import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { SyncManager } from '../sync/SyncManager';

const TASK_NAME = 'NOMAD_MEDIA_UPLOAD_TASK';

TaskManager.defineTask(TASK_NAME, async () => {
    try {
        await SyncManager.getInstance().processOfflineUploads();
        return BackgroundFetch.Result.NewData;
    } catch (e) {
        console.warn('[media.worker] Background upload task failed', e);
        return BackgroundFetch.Result.Failed;
    }
});

export async function registerBackgroundUploadTask() {
    try {
        await BackgroundFetch.registerTaskAsync(TASK_NAME, {
            minimumInterval: 15 * 60, // 15 minutes
            stopOnTerminate: false,
            startOnBoot: true,
        });
        console.log('[media.worker] Registered background upload task');
    } catch (e) {
        console.warn('[media.worker] Failed to register background task', e);
    }
}

export async function unregisterBackgroundUploadTask() {
    try {
        await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
        console.log('[media.worker] Unregistered background upload task');
    } catch (e) {
        console.warn('[media.worker] Failed to unregister background task', e);
    }
}
