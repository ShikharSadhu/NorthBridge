import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/widgets/app_card.dart';
import 'package:frontend/widgets/skeleton_box.dart';

class TaskCardSkeleton extends StatelessWidget {
  const TaskCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const AppCard(
      child: Padding(
        padding: AppSpacing.cardPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonBox(height: 18, width: 180),
            SizedBox(height: AppSpacing.xs),
            SkeletonBox(height: 14, width: 220),
            SizedBox(height: AppSpacing.xs),
            SkeletonBox(height: 14),
            SizedBox(height: AppSpacing.xxs),
            SkeletonBox(height: 14, width: 260),
            SizedBox(height: AppSpacing.sm),
            SkeletonBox(height: 12, width: 120),
            SizedBox(height: AppSpacing.xs),
            SkeletonBox(height: 12, width: 180),
          ],
        ),
      ),
    );
  }
}
