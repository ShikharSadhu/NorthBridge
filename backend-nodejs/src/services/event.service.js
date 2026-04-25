const websocketService = require('./websocket.service');
const notificationService = require('./notification.service');

function safeFire(p) {
    try {
        const maybePromise = p;
        if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.catch(() => {});
        }
    } catch (_) {}
}

async function notifyTaskCreated(task) {
    try {
        websocketService.broadcast({type: 'TASK_CREATED', data: task});
        safeFire(notificationService.notifyUsers([], {type: 'TASK_CREATED', data: task}));
    } catch (e) {
        console.warn('notifyTaskCreated error', e && e.message);
    }
}

async function notifyTaskAccepted(task) {
    try {
        websocketService.sendToUser(task.postedByUserId, {
            type: 'TASK_ACCEPTED',
            data: {taskId: task.id, acceptedBy: task.acceptedByUserId},
        });
        safeFire(notificationService.notifyUser(task.postedByUserId, {type: 'TASK_ACCEPTED', data: {taskId: task.id}}));
    } catch (e) {
        console.warn('notifyTaskAccepted error', e && e.message);
    }
}

async function notifyTaskCompleted(task) {
    try {
        websocketService.sendToUser(task.postedByUserId, {type: 'TASK_COMPLETED', data: task});
        safeFire(notificationService.notifyUser(task.postedByUserId, {type: 'TASK_COMPLETED', data: task}));
    } catch (e) {
        console.warn('notifyTaskCompleted error', e && e.message);
    }
}

async function notifyTaskCompletionRequested(task) {
    try {
        websocketService.sendToUser(task.postedByUserId, {type: 'TASK_COMPLETION_REQUESTED', data: task});
        safeFire(notificationService.notifyUser(task.postedByUserId, {type: 'TASK_COMPLETION_REQUESTED', data: task}));
    } catch (e) {
        console.warn('notifyTaskCompletionRequested error', e && e.message);
    }
}

async function notifyTaskCompletionDeclined(task) {
    try {
        websocketService.sendToUser(task.postedByUserId, {type: 'TASK_COMPLETION_DECLINED', data: task});
        safeFire(notificationService.notifyUser(task.postedByUserId, {type: 'TASK_COMPLETION_DECLINED', data: task}));
    } catch (e) {
        console.warn('notifyTaskCompletionDeclined error', e && e.message);
    }
}

async function notifyTaskCancelled(task) {
    try {
        websocketService.broadcast({type: 'TASK_CANCELLED', data: task});
        safeFire(notificationService.notifyUsers([task.postedByUserId], {type: 'TASK_CANCELLED', data: task}));
    } catch (e) {
        console.warn('notifyTaskCancelled error', e && e.message);
    }
}

async function notifyNewMessage(chat, message) {
    try {
        // Determine receiver (the other participant)
        const users = Array.isArray(chat?.users) ? chat.users : [];
        const receiver = users.find((u) => u !== message.senderId) || undefined;

        if (receiver) {
            websocketService.sendToUser(receiver, {type: 'NEW_MESSAGE', data: message});
            safeFire(notificationService.notifyUser(receiver, {type: 'NEW_MESSAGE', data: message}));
        }

        // Always echo to sender to sync UI
        if (message.senderId) {
            websocketService.sendToUser(message.senderId, {type: 'NEW_MESSAGE', data: message});
        }
    } catch (e) {
        console.warn('notifyNewMessage error', e && e.message);
    }
}

async function notifyReportCreated(report) {
    try {
        websocketService.broadcast({type: 'REPORT_CREATED', data: report});
        safeFire(notificationService.notifyUser(report.reporterUserId, {type: 'REPORT_CREATED', data: report}));
    } catch (e) {
        console.warn('notifyReportCreated error', e && e.message);
    }
}

async function notifyReportUpdated(report) {
    try {
        websocketService.broadcast({type: 'REPORT_UPDATED', data: report});
        safeFire(notificationService.notifyUser(report.reporterUserId, {type: 'REPORT_UPDATED', data: report}));
    } catch (e) {
        console.warn('notifyReportUpdated error', e && e.message);
    }
}

module.exports = {
    notifyTaskCreated,
    notifyTaskAccepted,
    notifyTaskCompleted,
    notifyTaskCompletionRequested,
    notifyTaskCompletionDeclined,
    notifyTaskCancelled,
    notifyNewMessage,
    notifyReportCreated,
    notifyReportUpdated,
};
