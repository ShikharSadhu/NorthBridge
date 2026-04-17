import 'package:frontend/models/task_mode.dart';
import 'package:frontend/models/task_sort_option_model.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/test_data/task_sort_options_test_data.dart';
import 'package:frontend/services/test_data/task_test_data.dart';

enum TaskAcceptResult {
  accepted,
  ownTask,
  alreadyAccepted,
  notFound,
}

enum TaskCompletionRequestResult {
  requested,
  notFound,
  notAcceptedHelper,
  alreadyCompleted,
}

enum TaskCompletionConfirmResult {
  completed,
  declined,
  notFound,
  notTaskOwner,
  noPendingRequest,
  alreadyCompleted,
}

enum TaskRatingResult {
  rated,
  notFound,
  notTaskOwner,
  notCompleted,
  noPendingRating,
  invalidRating,
}

class TaskService {
  static List<Map<String, dynamic>> _taskStore = taskPreviewApiResponse
      .map((task) => Map<String, dynamic>.from(task))
      .toList();

  Future<List<TaskSortOptionModel>> fetchSortOptions() async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    return taskSortOptionsApiResponse
        .map(TaskSortOptionModel.fromJson)
        .toList(growable: false);
  }

  Future<List<TaskModel>> fetchTasks({TaskSortType? sortBy}) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    final tasks = _taskStore.map(TaskModel.fromJson).toList(growable: false);
    return _sortTasks(tasks, sortBy);
  }

  Future<TaskModel> createTask({
    required String title,
    required String description,
    required String location,
    required double price,
    required DateTime scheduledAt,
    required TaskExecutionMode executionMode,
    String postedByUserId = 'u_1001',
    String postedByName = 'Aarav Sharma',
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));

    final created = TaskModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      postedByUserId: postedByUserId,
      postedByName: postedByName,
      title: title,
      description: description,
      location: location,
      price: price,
      distanceKm: 0,
      scheduledAt: scheduledAt,
      executionMode: executionMode,
    );

    _taskStore = [
      created.toJson(),
      ..._taskStore,
    ];

    return created;
  }

  Future<TaskAcceptResult> acceptTask({
    required String taskId,
    required String userId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));

    final taskIndex = _taskStore.indexWhere((task) => task['id'] == taskId);
    if (taskIndex < 0) {
      return TaskAcceptResult.notFound;
    }

    final current = TaskModel.fromJson(_taskStore[taskIndex]);
    if (current.postedByUserId == userId) {
      return TaskAcceptResult.ownTask;
    }

    if (current.acceptedByUserId != null &&
        current.acceptedByUserId != userId) {
      return TaskAcceptResult.alreadyAccepted;
    }

    final updated = current.copyWith(
      acceptedByUserId: userId,
      acceptedAt: DateTime.now().toUtc(),
    );

    final next = List<Map<String, dynamic>>.from(_taskStore);
    next[taskIndex] = updated.toJson();
    _taskStore = next;
    return TaskAcceptResult.accepted;
  }

  Future<TaskCompletionRequestResult> requestTaskCompletion({
    required String taskId,
    required String helperUserId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));

    final taskIndex = _taskStore.indexWhere((task) => task['id'] == taskId);
    if (taskIndex < 0) {
      return TaskCompletionRequestResult.notFound;
    }

    final current = TaskModel.fromJson(_taskStore[taskIndex]);
    if (!current.isActive) {
      return TaskCompletionRequestResult.alreadyCompleted;
    }

    if (current.acceptedByUserId != helperUserId) {
      return TaskCompletionRequestResult.notAcceptedHelper;
    }

    final updated = current.copyWith(
      completionRequestedByUserId: helperUserId,
      completionRequestedAt: DateTime.now().toUtc(),
      clearCompletionRequest: false,
    );

    final next = List<Map<String, dynamic>>.from(_taskStore);
    next[taskIndex] = updated.toJson();
    _taskStore = next;
    return TaskCompletionRequestResult.requested;
  }

  Future<TaskCompletionConfirmResult> confirmTaskCompletion({
    required String taskId,
    required String ownerUserId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));

    final taskIndex = _taskStore.indexWhere((task) => task['id'] == taskId);
    if (taskIndex < 0) {
      return TaskCompletionConfirmResult.notFound;
    }

    final current = TaskModel.fromJson(_taskStore[taskIndex]);
    if (current.postedByUserId != ownerUserId) {
      return TaskCompletionConfirmResult.notTaskOwner;
    }
    if (!current.isActive) {
      return TaskCompletionConfirmResult.alreadyCompleted;
    }
    if ((current.completionRequestedByUserId ?? '').isEmpty) {
      return TaskCompletionConfirmResult.noPendingRequest;
    }

    final updated = current.copyWith(
      isActive: false,
      completedByUserId: current.completionRequestedByUserId,
      completedAt: DateTime.now().toUtc(),
      isRatingPending: true,
      clearCompletionRequest: true,
    );

    final next = List<Map<String, dynamic>>.from(_taskStore);
    next[taskIndex] = updated.toJson();
    _taskStore = next;
    return TaskCompletionConfirmResult.completed;
  }

  Future<TaskCompletionConfirmResult> declineTaskCompletion({
    required String taskId,
    required String ownerUserId,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));

    final taskIndex = _taskStore.indexWhere((task) => task['id'] == taskId);
    if (taskIndex < 0) {
      return TaskCompletionConfirmResult.notFound;
    }

    final current = TaskModel.fromJson(_taskStore[taskIndex]);
    if (current.postedByUserId != ownerUserId) {
      return TaskCompletionConfirmResult.notTaskOwner;
    }
    if (!current.isActive) {
      return TaskCompletionConfirmResult.alreadyCompleted;
    }
    if ((current.completionRequestedByUserId ?? '').isEmpty) {
      return TaskCompletionConfirmResult.noPendingRequest;
    }

    final updated = current.copyWith(clearCompletionRequest: true);

    final next = List<Map<String, dynamic>>.from(_taskStore);
    next[taskIndex] = updated.toJson();
    _taskStore = next;
    return TaskCompletionConfirmResult.declined;
  }

  Future<TaskRatingResult> submitTaskRating({
    required String taskId,
    required String ownerUserId,
    required double rating,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));

    if (rating < 1 || rating > 5) {
      return TaskRatingResult.invalidRating;
    }

    final taskIndex = _taskStore.indexWhere((task) => task['id'] == taskId);
    if (taskIndex < 0) {
      return TaskRatingResult.notFound;
    }

    final current = TaskModel.fromJson(_taskStore[taskIndex]);
    if (current.postedByUserId != ownerUserId) {
      return TaskRatingResult.notTaskOwner;
    }
    if (current.isActive) {
      return TaskRatingResult.notCompleted;
    }
    if (!current.isRatingPending) {
      return TaskRatingResult.noPendingRating;
    }

    final updated = current.copyWith(
      completionRating: rating,
      ratedAt: DateTime.now().toUtc(),
      isRatingPending: false,
    );

    final next = List<Map<String, dynamic>>.from(_taskStore);
    next[taskIndex] = updated.toJson();
    _taskStore = next;
    return TaskRatingResult.rated;
  }

  Future<Map<String, dynamic>> processVoiceInput(String text) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));

    final cleaned = text.trim();
    final words =
        cleaned.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final priceMatch = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(cleaned);
    final parsedPrice = double.tryParse(priceMatch?.group(1) ?? '');

    final mode = _detectExecutionMode(cleaned);
    final locationMatch = RegExp(
      r'(?:in|at)\s+([A-Za-z0-9\s,]+)',
      caseSensitive: false,
    ).firstMatch(cleaned);
    final parsedLocation = locationMatch?.group(1)?.trim();

    final shortTitle = words.take(6).join(' ');

    return {
      'title': shortTitle.isEmpty ? 'Voice task' : shortTitle,
      'description':
          cleaned.isEmpty ? 'Task details from voice input.' : cleaned,
      'location': parsedLocation?.isNotEmpty == true
          ? parsedLocation
          : (mode == TaskExecutionMode.online ? 'Online' : 'Add location'),
      'price': parsedPrice ?? 0,
      'scheduledAt':
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
      'executionMode': mode.storageValue,
    };
  }

  TaskExecutionMode _detectExecutionMode(String text) {
    final hasOnline = RegExp(
      r'\bonline\b|ऑनलाइन',
      caseSensitive: false,
    ).hasMatch(text);
    final hasOffline = RegExp(
      r'\boffline\b|ऑफलाइन',
      caseSensitive: false,
    ).hasMatch(text);

    if (hasOffline) {
      return TaskExecutionMode.offline;
    }
    if (hasOnline) {
      return TaskExecutionMode.online;
    }
    return TaskExecutionMode.offline;
  }

  List<TaskModel> _sortTasks(List<TaskModel> tasks, TaskSortType? sortBy) {
    if (sortBy == null) {
      return tasks;
    }

    final sorted = List<TaskModel>.from(tasks);
    switch (sortBy) {
      case TaskSortType.defaultOrder:
        return sorted;
      case TaskSortType.distance:
        sorted.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
        return sorted;
      case TaskSortType.closestDate:
        sorted.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
        return sorted;
      case TaskSortType.latestDate:
        sorted.sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
        return sorted;
      case TaskSortType.online:
        return sorted
            .where((task) => task.executionMode == TaskExecutionMode.online)
            .toList(growable: false);
      case TaskSortType.offline:
        return sorted
            .where((task) => task.executionMode == TaskExecutionMode.offline)
            .toList(growable: false);
    }
  }
}
