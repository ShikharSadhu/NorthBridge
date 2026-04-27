import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/models/task_sort_option_model.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/task_card.dart';
import 'package:frontend/widgets/task_card_skeleton.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.taskProvider,
    required this.authProvider,
    this.showAppBar = true,
    this.showCreateShortcut = true,
  });

  static const String routeName = '/home';
  final TaskProvider taskProvider;
  final AuthProvider authProvider;
  final bool showAppBar;
  final bool showCreateShortcut;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final content = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: AnimatedBuilder(
          animation: Listenable.merge([taskProvider, authProvider]),
          builder: (context, _) {
            final currentUserId = authProvider.state.data?.id;
            if (taskProvider.state.isLoading && !taskProvider.hasCachedData) {
              return ListView.separated(
                padding: AppSpacing.screenPadding,
                itemCount: 4,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, index) => const TaskCardSkeleton(),
              );
            }

            if (taskProvider.state.isError && !taskProvider.hasCachedData) {
              return ListView(
                padding: AppSpacing.screenPadding,
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
              );
            }

            final visibleTasks = taskProvider.tasks
                .where((task) => task.isActive && task.acceptedByUserId == null)
                .toList(growable: false);

            if (taskProvider.state.isEmpty) {
              return ListView(
                padding: AppSpacing.screenPadding,
                children: [
                  if (taskProvider.sortOptions.isNotEmpty)
                    Align(
                      alignment: Alignment.centerRight,
                      child: PopupMenuButton<TaskSortType>(
                        onSelected: (sortType) {
                          taskProvider.applySort(sortType);
                        },
                        itemBuilder: (context) => taskProvider.sortOptions
                            .map(
                              (option) => PopupMenuItem<TaskSortType>(
                                value: option.type,
                                child: Text(option.label),
                              ),
                            )
                            .toList(growable: false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: theme.colorScheme.outlineVariant,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.sort, size: 18),
                              const SizedBox(width: AppSpacing.xxs),
                              Text(taskProvider.selectedSortLabel ?? 'Sort'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  if (taskProvider.sortOptions.isNotEmpty)
                    const SizedBox(height: AppSpacing.sm),
                  Text(
                    taskProvider.state.message ??
                        'No tasks available right now.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              );
            }

            if (visibleTasks.isEmpty) {
              return ListView(
                padding: AppSpacing.screenPadding,
                children: [
                  if (taskProvider.sortOptions.isNotEmpty)
                    Align(
                      alignment: Alignment.centerRight,
                      child: PopupMenuButton<TaskSortType>(
                        onSelected: (sortType) {
                          taskProvider.applySort(sortType);
                        },
                        itemBuilder: (context) => taskProvider.sortOptions
                            .map(
                              (option) => PopupMenuItem<TaskSortType>(
                                value: option.type,
                                child: Text(option.label),
                              ),
                            )
                            .toList(growable: false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: AppSpacing.xs,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: theme.colorScheme.outlineVariant,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.sort, size: 18),
                              const SizedBox(width: AppSpacing.xxs),
                              Text(taskProvider.selectedSortLabel ?? 'Sort'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  if (taskProvider.sortOptions.isNotEmpty)
                    const SizedBox(height: AppSpacing.sm),
                  Text(
                    'No open tasks available right now.',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              );
            }

            final hasTransientError = taskProvider.transientError != null;
            final hasSortControl = taskProvider.sortOptions.isNotEmpty;
            final headerItemsCount =
                (hasSortControl ? 1 : 0) + (hasTransientError ? 1 : 0);

            return ListView.separated(
              padding: AppSpacing.screenPadding,
              itemCount: visibleTasks.length + headerItemsCount,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                if (hasSortControl && index == 0) {
                  return Align(
                    alignment: Alignment.centerRight,
                    child: PopupMenuButton<TaskSortType>(
                      onSelected: (sortType) {
                        taskProvider.applySort(sortType);
                      },
                      itemBuilder: (context) => taskProvider.sortOptions
                          .map(
                            (option) => PopupMenuItem<TaskSortType>(
                              value: option.type,
                              child: Text(option.label),
                            ),
                          )
                          .toList(growable: false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: theme.colorScheme.outlineVariant,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.sort, size: 18),
                            const SizedBox(width: AppSpacing.xxs),
                            Text(taskProvider.selectedSortLabel ?? 'Sort'),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                if (hasTransientError && index == (hasSortControl ? 1 : 0)) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                  );
                }

                final taskIndex = index - headerItemsCount;
                final task = visibleTasks[taskIndex];
                return TaskCard(
                  task: task,
                  currentUserId: currentUserId,
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
        actions: null,
      ),
      body: content,
    );
  }
}
