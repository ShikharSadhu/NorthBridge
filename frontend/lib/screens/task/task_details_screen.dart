import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';

class TaskDetailsScreen extends StatelessWidget {
  const TaskDetailsScreen({
    super.key,
    required this.taskProvider,
    required this.taskId,
  });

  static const String routeName = '/task/details';

  final TaskProvider taskProvider;
  final String taskId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final taskIndex =
        taskProvider.tasks.indexWhere((item) => item.id == taskId);
    final task = taskIndex >= 0 ? taskProvider.tasks[taskIndex] : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task details'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: task == null
                ? Center(
                    child: Text(
                      'Task not found.',
                      style: theme.textTheme.bodyMedium,
                    ),
                  )
                : AppCard(
                    child: Padding(
                      padding: AppSpacing.cardPadding,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(task.title, style: theme.textTheme.titleLarge),
                          const SizedBox(height: AppSpacing.sm),
                          Text(task.location,
                              style: theme.textTheme.bodyMedium),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            '\$${task.price.toStringAsFixed(0)} • ${task.distanceKm.toStringAsFixed(1)} km away',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.secondary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            '${formatTaskDate(task.scheduledAt)} • ${formatTaskTime(task.scheduledAt)}',
                            style: theme.textTheme.bodySmall,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            task.description,
                            style: theme.textTheme.bodyMedium,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          AppButton(
                            label: 'Accept task',
                            onPressed: () {},
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
