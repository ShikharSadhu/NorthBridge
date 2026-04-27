import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/models/chat_model.dart';
import 'package:frontend/models/voice_task_draft_model.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/chat_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/providers/voice_provider.dart';
import 'package:frontend/screens/auth/auth_screen.dart';
import 'package:frontend/screens/chat/chat_list_screen.dart';
import 'package:frontend/screens/chat/chat_thread_screen.dart';
import 'package:frontend/screens/home/home_screen.dart';
import 'package:frontend/screens/profile/profile_screen.dart';
import 'package:frontend/screens/profile/public_profile_screen.dart';
import 'package:frontend/screens/task/task_details_screen.dart';
import 'package:frontend/screens/task/task_history_screen.dart';
import 'package:frontend/screens/task/task_post_screen.dart';
import 'package:frontend/screens/task/task_root_screen.dart';
import 'package:frontend/voice/voice_input_screen.dart';
import 'package:frontend/voice/voice_preview_screen.dart';

class AppRoutes {
  static const String taskRoot = TaskRootScreen.routeName;
  static const String auth = AuthScreen.routeName;
  static const String chat = ChatListScreen.routeName;
  static const String chatThread = ChatThreadScreen.routeName;
  static const String profile = ProfileScreen.routeName;
  static const String publicProfile = PublicProfileScreen.routeName;
  static const String home = HomeScreen.routeName;
  static const String taskDetails = TaskDetailsScreen.routeName;
  static const String taskHistory = TaskHistoryScreen.routeName;
  static const String taskPost = TaskPostScreen.routeName;
  static const String voiceInput = VoiceInputScreen.routeName;
  static const String voicePreview = VoicePreviewScreen.routeName;
  static const String initialRoute = taskRoot;

  static Map<String, WidgetBuilder> routes({
    required TaskProvider taskProvider,
    required AuthProvider authProvider,
    required ChatProvider chatProvider,
  }) {
    return {
      taskRoot: (_) => TaskRootScreen(
            taskProvider: taskProvider,
            authProvider: authProvider,
          ),
      home: (_) => HomeScreen(
            taskProvider: taskProvider,
            authProvider: authProvider,
          ),
      auth: (_) => AuthScreen(authProvider: authProvider),
      chat: (_) => ChatListScreen(
            chatProvider: chatProvider,
            authProvider: authProvider,
          ),
      profile: (_) => ProfileScreen(authProvider: authProvider),
    };
  }

  static Route<dynamic>? onGenerateRoute(
    RouteSettings settings, {
    required TaskProvider taskProvider,
    required AuthProvider authProvider,
    required ChatProvider chatProvider,
  }) {
    if (settings.name == taskDetails) {
      final args = settings.arguments;
      if (args is TaskDetailsArgs) {
        return MaterialPageRoute<void>(
          builder: (_) => TaskDetailsScreen(
            taskProvider: taskProvider,
            authProvider: authProvider,
            chatProvider: chatProvider,
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
        builder: (_) => TaskPostScreen(
          taskProvider: taskProvider,
          authProvider: authProvider,
        ),
        settings: settings,
      );
    }

    if (settings.name == taskHistory) {
      return MaterialPageRoute<void>(
        builder: (_) => TaskHistoryScreen(
          taskProvider: taskProvider,
          authProvider: authProvider,
        ),
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

    if (settings.name == chatThread) {
      final args = settings.arguments;
      if (args is ChatThreadArgs) {
        return MaterialPageRoute<void>(
          builder: (_) => ChatThreadScreen(
            chatProvider: chatProvider,
            authProvider: authProvider,
            taskProvider: taskProvider,
            chat: args.chat,
          ),
          settings: settings,
        );
      }

      return MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          body: Center(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: const Text('Invalid chat thread route arguments.'),
            ),
          ),
        ),
      );
    }

    if (settings.name == publicProfile) {
      final args = settings.arguments;
      if (args is PublicProfileArgs) {
        return MaterialPageRoute<void>(
          builder: (_) => PublicProfileScreen(
            authProvider: authProvider,
            userId: args.userId,
          ),
          settings: settings,
        );
      }

      return MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          body: Center(
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: const Text('Invalid public profile route arguments.'),
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

  static Future<T?> goToTaskHistory<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(taskHistory);
  }

  static Future<T?> goToAuth<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(auth);
  }

  static Future<T?> goToProfile<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(profile);
  }

  static Future<T?> goToChat<T extends Object?>(BuildContext context) {
    return Navigator.of(context).pushNamed<T>(chat);
  }

  static Future<T?> goToChatThread<T extends Object?>(
    BuildContext context, {
    required ChatModel chatModel,
  }) {
    return Navigator.of(context).pushNamed<T>(
      chatThread,
      arguments: ChatThreadArgs(chat: chatModel),
    );
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

  static Future<T?> goToPublicProfile<T extends Object?>(
    BuildContext context, {
    required String userId,
  }) {
    return Navigator.of(context).pushNamed<T>(
      publicProfile,
      arguments: PublicProfileArgs(userId: userId),
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

class ChatThreadArgs {
  const ChatThreadArgs({required this.chat});

  final ChatModel chat;
}

class PublicProfileArgs {
  const PublicProfileArgs({required this.userId});

  final String userId;
}
