import 'package:frontend/models/task_mode.dart';
import 'package:frontend/models/task_sort_option_model.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/api_service.dart';

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
  TaskService({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  final ApiService _apiService;

  static const List<TaskSortOptionModel> _sortOptions = [
    TaskSortOptionModel(type: TaskSortType.defaultOrder, label: 'Default'),
    TaskSortOptionModel(type: TaskSortType.distance, label: 'Distance'),
    TaskSortOptionModel(type: TaskSortType.closestDate, label: 'Closest date'),
    TaskSortOptionModel(type: TaskSortType.latestDate, label: 'Latest date'),
    TaskSortOptionModel(type: TaskSortType.online, label: 'Online'),
    TaskSortOptionModel(type: TaskSortType.offline, label: 'Offline'),
  ];

  List<Map<String, dynamic>> _taskStore = const [];
  double? _acceptorLat;
  double? _acceptorLng;

  Future<List<TaskSortOptionModel>> fetchSortOptions() async {
    return _sortOptions;
  }

  Future<List<TaskModel>> fetchTasks({TaskSortType? sortBy}) async {
    try {
      final response = await _apiService.getJson(
        '/v1/tasks',
        queryParameters: {
          'sortBy': _toApiSortValue(sortBy),
          'acceptorLat': _acceptorLat,
          'acceptorLng': _acceptorLng,
        },
      );
      final rawTasks = (response['tasks'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(growable: false);

      final tasks = rawTasks.map(TaskModel.fromJson).toList(growable: false);
      _taskStore = rawTasks;
      return tasks;
    } catch (_) {
      if (_taskStore.isEmpty) {
        rethrow;
      }

      final tasks = _taskStore.map(TaskModel.fromJson).toList(growable: false);
      return _sortTasks(tasks, sortBy);
    }
  }

  void setAcceptorLocation({double? lat, double? lng}) {
    _acceptorLat = lat;
    _acceptorLng = lng;
  }

  Future<TaskModel> createTask({
    required String title,
    required String description,
    required String location,
    required double price,
    required DateTime scheduledAt,
    required TaskExecutionMode executionMode,
    required String postedByUserId,
    required String postedByName,
  }) async {
    final response = await _apiService.postJson(
      '/v1/tasks',
      body: {
        'title': title,
        'description': description,
        'location': location,
        'price': price,
        'scheduledAt': scheduledAt.toIso8601String(),
        'executionMode': executionMode.storageValue,
        'postedByUserId': postedByUserId,
        'postedByName': postedByName,
      },
    );

    final rawTask = response['task'];
    if (rawTask is! Map) {
      throw Exception('Invalid task response.');
    }

    final created = TaskModel.fromJson(Map<String, dynamic>.from(rawTask));
    _upsertTaskCache(created.toJson());
    return created;
  }

  Future<TaskAcceptResult> acceptTask({
    required String taskId,
    required String userId,
  }) async {
    try {
      final response = await _apiService.postJson(
        '/v1/tasks/$taskId/accept',
        body: {
          'acceptedByUserId': userId,
        },
      );
      _upsertTaskCache(response['task']);
      return TaskAcceptResult.accepted;
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return TaskAcceptResult.notFound;
      }
      if (error.statusCode == 409) {
        return TaskAcceptResult.alreadyAccepted;
      }
      if (error.statusCode == 400 &&
          error.message.toLowerCase().contains('own task')) {
        return TaskAcceptResult.ownTask;
      }
      rethrow;
    }
  }

  Future<TaskCompletionRequestResult> requestTaskCompletion({
    required String taskId,
    required String helperUserId,
  }) async {
    try {
      final response = await _apiService.postJson(
        '/v1/tasks/$taskId/completion/request',
        body: {
          'helperUserId': helperUserId,
        },
      );
      _upsertTaskCache(response['task']);
      return TaskCompletionRequestResult.requested;
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return TaskCompletionRequestResult.notFound;
      }
      if (error.statusCode == 409) {
        return TaskCompletionRequestResult.alreadyCompleted;
      }
      if (error.statusCode == 403) {
        return TaskCompletionRequestResult.notAcceptedHelper;
      }
      rethrow;
    }
  }

  Future<TaskCompletionConfirmResult> confirmTaskCompletion({
    required String taskId,
    required String ownerUserId,
  }) async {
    try {
      final response = await _apiService.postJson(
        '/v1/tasks/$taskId/completion/confirm',
        body: {
          'ownerUserId': ownerUserId,
        },
      );
      _upsertTaskCache(response['task']);
      return TaskCompletionConfirmResult.completed;
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return TaskCompletionConfirmResult.notFound;
      }
      if (error.statusCode == 403) {
        return TaskCompletionConfirmResult.notTaskOwner;
      }
      if (error.statusCode == 409 &&
          error.message.toLowerCase().contains('already completed')) {
        return TaskCompletionConfirmResult.alreadyCompleted;
      }
      if (error.statusCode == 409 &&
          error.message.toLowerCase().contains('no pending completion')) {
        return TaskCompletionConfirmResult.noPendingRequest;
      }
      rethrow;
    }
  }

  Future<TaskCompletionConfirmResult> declineTaskCompletion({
    required String taskId,
    required String ownerUserId,
  }) async {
    try {
      final response = await _apiService.postJson(
        '/v1/tasks/$taskId/completion/decline',
        body: {
          'ownerUserId': ownerUserId,
        },
      );
      _upsertTaskCache(response['task']);
      return TaskCompletionConfirmResult.declined;
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return TaskCompletionConfirmResult.notFound;
      }
      if (error.statusCode == 403) {
        return TaskCompletionConfirmResult.notTaskOwner;
      }
      if (error.statusCode == 409 &&
          error.message.toLowerCase().contains('already completed')) {
        return TaskCompletionConfirmResult.alreadyCompleted;
      }
      if (error.statusCode == 409 &&
          error.message.toLowerCase().contains('no pending completion')) {
        return TaskCompletionConfirmResult.noPendingRequest;
      }
      rethrow;
    }
  }

  Future<TaskRatingResult> submitTaskRating({
    required String taskId,
    required String ownerUserId,
    required double rating,
  }) async {
    try {
      final response = await _apiService.postJson(
        '/v1/tasks/$taskId/rating',
        body: {
          'ownerUserId': ownerUserId,
          'rating': rating,
        },
      );
      _upsertTaskCache(response['task']);
      return TaskRatingResult.rated;
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return TaskRatingResult.notFound;
      }
      if (error.statusCode == 403) {
        return TaskRatingResult.notTaskOwner;
      }
      if (error.statusCode == 400) {
        return TaskRatingResult.invalidRating;
      }
      if (error.statusCode == 409 &&
          error.message.toLowerCase().contains('not completed')) {
        return TaskRatingResult.notCompleted;
      }
      if (error.statusCode == 409 &&
          error.message.toLowerCase().contains('no pending rating')) {
        return TaskRatingResult.noPendingRating;
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> processVoiceInput(String text) async {
    final response = await _apiService.postJson(
      '/v1/voice/parse-task',
      body: {
        'transcript': text,
      },
    );

    final rawDraft = response['draft'];
    if (rawDraft is! Map) {
      throw Exception('Invalid voice draft response.');
    }

    return Map<String, dynamic>.from(rawDraft);
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

  String? _toApiSortValue(TaskSortType? sortBy) {
    switch (sortBy) {
      case null:
        return null;
      case TaskSortType.defaultOrder:
        return 'default';
      case TaskSortType.distance:
        return 'distance';
      case TaskSortType.closestDate:
        return 'closestDate';
      case TaskSortType.latestDate:
        return 'latestDate';
      case TaskSortType.online:
        return 'online';
      case TaskSortType.offline:
        return 'offline';
    }
  }

  void _upsertTaskCache(dynamic rawTask) {
    if (rawTask is! Map) {
      return;
    }

    final taskMap = Map<String, dynamic>.from(rawTask);
    final taskId = taskMap['id'];
    if (taskId is! String || taskId.isEmpty) {
      return;
    }

    final existingIndex = _taskStore.indexWhere((task) => task['id'] == taskId);
    if (existingIndex < 0) {
      _taskStore = [taskMap, ..._taskStore];
      return;
    }

    final next = List<Map<String, dynamic>>.from(_taskStore);
    next[existingIndex] = taskMap;
    _taskStore = next;
  }
}
