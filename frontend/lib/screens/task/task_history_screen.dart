import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/models/task_mode.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';

class TaskHistoryScreen extends StatelessWidget {
  const TaskHistoryScreen({
    super.key,
    required this.taskProvider,
    required this.authProvider,
  });

  static const String routeName = '/task/history';

  final TaskProvider taskProvider;
  final AuthProvider authProvider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task history'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: AnimatedBuilder(
            animation: Listenable.merge([taskProvider, authProvider]),
            builder: (context, _) {
              final user = authProvider.state.data;
              if (user == null) {
                return Padding(
                  padding: AppSpacing.screenPadding,
                  child: AppCard(
                    child: Padding(
                      padding: AppSpacing.cardPadding,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Login required',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Please login to view accepted task history.',
                            style: theme.textTheme.bodyMedium,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          AppButton(
                            label: 'Open Login / Signup',
                            onPressed: () => AppRoutes.goToAuth(context),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              final acceptedTasks = taskProvider.tasks
                  .where((task) => task.acceptedByUserId == user.id)
                  .toList(growable: false);
                final ongoing = acceptedTasks
                  .where((task) => task.isActive)
                  .toList(growable: false);
                final past = acceptedTasks
                  .where((task) => !task.isActive)
                  .toList(growable: false);
              final totalEarned =
                  past.fold<double>(0, (sum, task) => sum + task.price);

              return ListView(
                padding: AppSpacing.screenPadding,
                children: [
                  AppCard(
                    child: Padding(
                      padding: AppSpacing.cardPadding,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Ongoing tasks',
                            style: theme.textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          if (ongoing.isEmpty)
                            Text(
                              'No ongoing accepted tasks.',
                              style: theme.textTheme.bodyMedium,
                            )
                          else
                            ...ongoing.map(_TaskHistoryCard.new),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  AppCard(
                    child: Padding(
                      padding: AppSpacing.cardPadding,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Past tasks',
                            style: theme.textTheme.titleLarge,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Total earned: ₹${totalEarned.toStringAsFixed(0)}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          if (past.isEmpty)
                            Text(
                              'No completed tasks yet.',
                              style: theme.textTheme.bodyMedium,
                            )
                          else
                            ...past.map(_TaskHistoryCard.new),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _TaskHistoryCard extends StatelessWidget {
  const _TaskHistoryCard(this.task);

  final TaskModel task;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm),
      child: AppCard(
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(task.title, style: theme.textTheme.titleMedium),
                  ),
                  if (task.acceptedByUserId != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: AppSpacing.xxs,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'Accepted',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                'Posted by ${task.postedByName}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(task.description, style: theme.textTheme.bodyMedium),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${formatTaskDate(task.scheduledAt)} • ${formatTaskTime(task.scheduledAt)}',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                task.executionMode.displayLabel,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.secondary,
                ),
              ),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                task.location,
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: AppSpacing.xxs),
              Text(
                'Earning: ₹${task.price.toStringAsFixed(0)}',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
