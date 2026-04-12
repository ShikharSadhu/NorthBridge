import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/task_card.dart';
import 'package:frontend/widgets/task_card_skeleton.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.taskProvider,
    this.showAppBar = true,
    this.showCreateShortcut = true,
  });

  static const String routeName = '/home';
  final TaskProvider taskProvider;
  final bool showAppBar;
  final bool showCreateShortcut;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final content = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: AnimatedBuilder(
          animation: taskProvider,
          builder: (context, _) {
            if (taskProvider.state.isLoading && !taskProvider.hasCachedData) {
              return ListView.separated(
                padding: AppSpacing.screenPadding,
                itemCount: 4,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Nearby requests',
                          style: theme.textTheme.titleLarge,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Clear, local tasks you can accept quickly.',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    );
                  }

                  return const TaskCardSkeleton();
                },
              );
            }

            if (taskProvider.state.isError && !taskProvider.hasCachedData) {
              return Center(
                child: Padding(
                  padding: AppSpacing.screenPadding,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        taskProvider.state.message ?? 'Something went wrong.',
                        style: theme.textTheme.bodyMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      AppButton(
                        label: 'Retry',
                        onPressed: taskProvider.retry,
                        isFullWidth: false,
                      ),
                    ],
                  ),
                ),
              );
            }

            if (taskProvider.state.isEmpty) {
              return Center(
                child: Text(
                  taskProvider.state.message ?? 'No tasks available right now.',
                  style: theme.textTheme.bodyMedium,
                ),
              );
            }

            return ListView.separated(
              padding: AppSpacing.screenPadding,
              itemCount: taskProvider.tasks.length + 1,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Nearby requests',
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Clear, local tasks you can accept quickly.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if (taskProvider.transientError != null) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          '${taskProvider.transientError} Showing cached tasks.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.error,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        AppButton(
                          label: 'Retry',
                          onPressed: taskProvider.retry,
                          isFullWidth: false,
                        ),
                      ],
                    ],
                  );
                }

                final task = taskProvider.tasks[index - 1];
                return TaskCard(
                  task: task,
                  onTap: () => AppRoutes.goToTaskDetails(
                    context,
                    taskId: task.id,
                  ),
                );
              },
            );
          },
        ),
      ),
    );

    if (!showAppBar) {
      return content;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        actions: showCreateShortcut
            ? [
                IconButton(
                  onPressed: () => AppRoutes.goToTaskPost(context),
                  icon: const Icon(Icons.add),
                  tooltip: 'Post task',
                ),
              ]
            : null,
      ),
      body: content,
    );
  }
}
