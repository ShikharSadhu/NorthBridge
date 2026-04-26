import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/models/task_mode.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/chat_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';
import 'package:frontend/widgets/user_name_with_avatar.dart';

class TaskDetailsScreen extends StatelessWidget {
  const TaskDetailsScreen({
    super.key,
    required this.taskProvider,
    required this.authProvider,
    required this.chatProvider,
    required this.taskId,
  });

  static const String routeName = '/task/details';

  final TaskProvider taskProvider;
  final AuthProvider authProvider;
  final ChatProvider chatProvider;
  final String taskId;

  Future<void> _openTaskChat(BuildContext context, task) async {
    final user = authProvider.state.data;
    if (user == null) {
      await AppRoutes.goToChat(context);
      return;
    }

    final chat = await chatProvider.openOrCreateTaskChat(
      task: task,
      helperUserId: user.id,
    );
    if (!context.mounted) {
      return;
    }

    if (chat == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open chat right now.')),
      );
      return;
    }

    await AppRoutes.goToChatThread(context, chatModel: chat);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task details'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: AnimatedBuilder(
            animation: taskProvider,
            builder: (context, _) {
              final taskIndex =
                  taskProvider.tasks.indexWhere((item) => item.id == taskId);
              final task =
                  taskIndex >= 0 ? taskProvider.tasks[taskIndex] : null;
              final user = authProvider.state.data;
              final userId = user?.id;

              return Padding(
                padding: AppSpacing.screenPadding,
                child: task == null
                    ? Center(
                        child: Text(
                          'Task not found.',
                          style: theme.textTheme.bodyMedium,
                        ),
                      )
                    : SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: double.infinity,
                              child: AppCard(
                                child: Padding(
                                  padding: AppSpacing.cardPadding,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      Text(
                                        task.title,
                                        style: theme.textTheme.titleLarge,
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: AppSpacing.xxs),
                                      Center(
                                        child: UserNameWithAvatar(
                                          userId: task.postedByUserId,
                                          name: task.postedByName,
                                          onTap: () =>
                                              AppRoutes.goToPublicProfile(
                                            context,
                                            userId: task.postedByUserId,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: AppSpacing.sm),
                                      Text(
                                        task.description,
                                        style: theme.textTheme.bodyLarge,
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            SizedBox(
                              width: double.infinity,
                              child: AppCard(
                                child: Padding(
                                  padding: AppSpacing.cardPadding,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Task details',
                                        style: theme.textTheme.titleLarge,
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: AppSpacing.sm),
                                      Text(
                                        task.location,
                                        style: theme.textTheme.bodyLarge,
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: AppSpacing.xs),
                                      Text(
                                        '${task.executionMode.displayLabel} • ₹${task.price.toStringAsFixed(0)} • ${task.distanceKm.toStringAsFixed(1)} km away',
                                        style:
                                            theme.textTheme.bodyLarge?.copyWith(
                                          color: theme.colorScheme.secondary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                      const SizedBox(height: AppSpacing.xs),
                                      Text(
                                        '${formatTaskDate(task.scheduledAt)} • ${formatTaskTime(task.scheduledAt)}',
                                        style: theme.textTheme.bodyMedium,
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            if (userId == null)
                              AppButton(
                                label: 'Accept task',
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Please login first to accept a task.',
                                      ),
                                    ),
                                  );
                                },
                              )
                            else if (task.postedByUserId == userId)
                              AppButton(
                                label: 'Your task',
                                onPressed: null,
                              )
                            else if (task.acceptedByUserId == userId ||
                                task.pendingAcceptanceByUserId == userId)
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton.tonalIcon(
                                      onPressed: null,
                                      icon: const Icon(Icons.check_circle),
                                      label: Text(
                                        task.acceptedByUserId == userId
                                            ? 'Accepted'
                                            : 'Requested',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.xs),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _openTaskChat(
                                        context,
                                        task,
                                      ),
                                      icon: const Icon(Icons.chat_bubble),
                                      label: const Text('Chat'),
                                    ),
                                  ),
                                ],
                              )
                            else if (task.acceptedByUserId != null)
                              AppButton(
                                label: 'Accepted',
                                onPressed: null,
                              )
                            else if (task.pendingAcceptanceByUserId != null)
                              AppButton(
                                label: 'Acceptance pending',
                                onPressed: null,
                              )
                            else
                              AppButton(
                                label: 'Accept task',
                                onPressed: () async {
                                  final outcome = await taskProvider.acceptTask(
                                    taskId: task.id,
                                    userId: userId,
                                  );

                                  if (!context.mounted) {
                                    return;
                                  }

                                  String message;
                                  switch (outcome) {
                                    case AcceptTaskOutcome.accepted:
                                      message = 'Task accepted.';
                                      break;
                                    case AcceptTaskOutcome.pendingApproval:
                                      message =
                                          'Acceptance request sent. Wait for the task giver in chat.';
                                      break;
                                    case AcceptTaskOutcome.ownTask:
                                      message =
                                          'You cannot accept your own task.';
                                      break;
                                    case AcceptTaskOutcome.alreadyAccepted:
                                      message =
                                          'This task is already accepted.';
                                      break;
                                    case AcceptTaskOutcome.notFound:
                                      message = 'Task no longer available.';
                                      break;
                                    case AcceptTaskOutcome.failed:
                                      message =
                                          'Unable to accept task right now.';
                                      break;
                                  }

                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(message)),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
              );
            },
          ),
        ),
      ),
    );
  }
}
