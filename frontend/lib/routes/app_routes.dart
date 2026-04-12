import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/models/voice_task_draft_model.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/providers/voice_provider.dart';
import 'package:frontend/screens/auth/auth_screen.dart';
import 'package:frontend/screens/home/home_screen.dart';
import 'package:frontend/screens/task/task_details_screen.dart';
import 'package:frontend/screens/task/task_post_screen.dart';
import 'package:frontend/screens/task/task_root_screen.dart';
import 'package:frontend/voice/voice_input_screen.dart';
import 'package:frontend/voice/voice_preview_screen.dart';

class AppRoutes {
  static const String taskRoot = TaskRootScreen.routeName;
  static const String auth = AuthScreen.routeName;
  static const String home = HomeScreen.routeName;
  static const String taskDetails = TaskDetailsScreen.routeName;
  static const String taskPost = TaskPostScreen.routeName;
  static const String voiceInput = VoiceInputScreen.routeName;
  static const String voicePreview = VoicePreviewScreen.routeName;
  static const String initialRoute = taskRoot;

  static Map<String, WidgetBuilder> routes({
    required TaskProvider taskProvider,
    required AuthProvider authProvider,
  }) {
    return {
      taskRoot: (_) => TaskRootScreen(taskProvider: taskProvider),
      home: (_) => HomeScreen(taskProvider: taskProvider),
      auth: (_) => AuthScreen(authProvider: authProvider),
    };
  }

  static Route<dynamic>? onGenerateRoute(
    RouteSettings settings, {
    required TaskProvider taskProvider,
    required AuthProvider authProvider,
  }) {
    if (settings.name == taskDetails) {
      final args = settings.arguments;
      if (args is TaskDetailsArgs) {
        return MaterialPageRoute<void>(
          builder: (_) => TaskDetailsScreen(
            taskProvider: taskProvider,
            taskId: args.taskId,
          ),
          settings: settings,
        );
      }

      return MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          body: Center(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: const Text('Invalid task details route arguments.'),
            ),
          ),
        ),
      );
    }

    if (settings.name == taskPost) {
      return MaterialPageRoute<void>(
        builder: (_) => TaskPostScreen(taskProvider: taskProvider),
        settings: settings,
      );
    }

    if (settings.name == voiceInput) {
      return MaterialPageRoute<VoiceTaskDraftModel?>(
        builder: (_) => VoiceInputScreen(voiceProvider: VoiceProvider()),
        settings: settings,
      );
    }

    if (settings.name == voicePreview) {
      final args = settings.arguments;
      if (args is VoicePreviewArgs) {
        return MaterialPageRoute<VoiceTaskDraftModel>(
          builder: (_) => VoicePreviewScreen(initialDraft: args.draft),
          settings: settings,
        );
      }

      return MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          body: Center(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: const Text('Invalid voice preview route arguments.'),
            ),
          ),
        ),
      );
    }

    return null;
  }

  static Future<T?> goToHome<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(home);
  }

  static Future<T?> goToTaskDetails<T extends Object?>(
    BuildContext context, {
    required String taskId,
  }) {
    return Navigator.of(context).pushNamed<T>(
      taskDetails,
      arguments: TaskDetailsArgs(taskId: taskId),
    );
  }

  static Future<T?> goToTaskPost<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(taskPost);
  }

  static Future<T?> goToAuth<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(auth);
  }

  static Future<VoiceTaskDraftModel?> goToVoiceInput(BuildContext context) {
    return Navigator.of(context).pushNamed<VoiceTaskDraftModel?>(voiceInput);
  }

  static Future<VoiceTaskDraftModel?> goToVoicePreview(
    BuildContext context, {
    required VoiceTaskDraftModel draft,
  }) {
    return Navigator.of(context).pushNamed<VoiceTaskDraftModel?>(
      voicePreview,
      arguments: VoicePreviewArgs(draft: draft),
    );
  }
}

class TaskDetailsArgs {
  const TaskDetailsArgs({required this.taskId});

  final String taskId;
}

class VoicePreviewArgs {
  const VoicePreviewArgs({required this.draft});

  final VoiceTaskDraftModel draft;
}
