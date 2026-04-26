import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/task_mode.dart';
import 'package:frontend/models/task_sort_option_model.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/task_service.dart';

enum AcceptTaskOutcome {
  accepted,
  pendingApproval,
  ownTask,
  alreadyAccepted,
  notFound,
  failed,
}

enum TaskAcceptanceDecisionOutcome {
  accepted,
  declined,
  notFound,
  notTaskOwner,
  noPendingRequest,
  alreadyAccepted,
  failed,
}

enum RequestCompletionOutcome {
  requested,
  notFound,
  notAcceptedHelper,
  alreadyCompleted,
  failed,
}

enum ConfirmCompletionOutcome {
  completed,
  declined,
  notFound,
  notTaskOwner,
  noPendingRequest,
  alreadyCompleted,
  failed,
}

enum SubmitRatingOutcome {
  rated,
  notFound,
  notTaskOwner,
  notCompleted,
  noPendingRating,
  invalidRating,
  failed,
}

class TaskProvider extends ChangeNotifier {
  TaskProvider({TaskService? taskService})
      : _taskService = taskService ?? TaskService(),
        _state = ViewState<List<TaskModel>>.loading();

  final TaskService _taskService;

  ViewState<List<TaskModel>> _state;
  List<TaskModel> _cachedTasks = const [];
  String? _transientError;
  bool _isCreating = false;
  List<TaskSortOptionModel> _sortOptions = const [];
  TaskSortType? _selectedSort;
  double? _acceptorLat;
  double? _acceptorLng;

  ViewState<List<TaskModel>> get state => _state;
  List<TaskModel> get tasks => _state.data ?? const [];
  bool get hasCachedData => _cachedTasks.isNotEmpty;
  String? get transientError => _transientError;
  bool get isCreating => _isCreating;
  List<TaskSortOptionModel> get sortOptions => _sortOptions;
  TaskSortType? get selectedSort => _selectedSort;
  String? get selectedSortLabel {
    final selected = _sortOptions
        .where((option) => option.type == _selectedSort)
        .toList(growable: false);
    if (selected.isEmpty) {
      return null;
    }
    return selected.first.label;
  }

  double? get acceptorLat => _acceptorLat;
  double? get acceptorLng => _acceptorLng;

  void applyRealtimeEvent(dynamic event) {
    if (event is! Map) {
      return;
    }

    final type = event['type'];
    final data = event['data'];
    if (type is! String || data is! Map) {
      return;
    }

    switch (type) {
      case 'TASK_CREATED':
      case 'TASK_COMPLETION_REQUESTED':
      case 'TASK_COMPLETED':
      case 'TASK_COMPLETION_DECLINED':
      case 'TASK_CANCELLED':
        _upsertRealtimeTask(Map<String, dynamic>.from(data));
        return;
      case 'TASK_ACCEPTANCE_REQUESTED':
        _applyTaskAcceptanceRequested(Map<String, dynamic>.from(data));
        return;
      case 'TASK_ACCEPTANCE_DECLINED':
        _applyTaskAcceptanceDeclined(Map<String, dynamic>.from(data));
        return;
      case 'TASK_ACCEPTED':
        _applyTaskAccepted(Map<String, dynamic>.from(data));
        return;
    }
  }

  void setAcceptorLocation({double? lat, double? lng}) {
    _acceptorLat = lat;
    _acceptorLng = lng;
    _taskService.setAcceptorLocation(lat: lat, lng: lng);
  }

  Future<void> loadTasks() async {
    _transientError = null;
    _state = ViewState<List<TaskModel>>.loading(previousData: _cachedTasks);
    notifyListeners();

    try {
      if (_sortOptions.isEmpty) {
        _sortOptions = await _taskService.fetchSortOptions();
      }

      final fetchedTasks = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = fetchedTasks;

      if (fetchedTasks.isEmpty) {
        _state = ViewState<List<TaskModel>>.empty(
          message: 'No tasks available right now.',
        );
      } else {
        _state = ViewState<List<TaskModel>>.success(fetchedTasks);
      }
    } catch (_) {
      const message = 'Unable to load tasks right now.';
      if (_cachedTasks.isNotEmpty) {
        _transientError = message;
        _state = ViewState<List<TaskModel>>.success(_cachedTasks);
      } else {
        _state = ViewState<List<TaskModel>>.error(message);
      }
    }

    notifyListeners();
  }

  Future<void> retry() async {
    await loadTasks();
  }

  void _upsertRealtimeTask(Map<String, dynamic> rawTask) {
    final taskId = rawTask['id'];
    if (taskId is! String || taskId.isEmpty) {
      return;
    }

    final task = TaskModel.fromJson(rawTask);
    final next = List<TaskModel>.from(_cachedTasks);
    final index = next.indexWhere((item) => item.id == task.id);
    if (index < 0) {
      next.insert(0, task);
    } else {
      next[index] = task;
    }

    _cachedTasks = next;
    _state = ViewState<List<TaskModel>>.success(next);
    notifyListeners();
  }

  void _applyTaskAccepted(Map<String, dynamic> data) {
    final taskId = data['taskId'];
    final acceptedBy = data['acceptedBy'];
    if (taskId is! String || acceptedBy is! String) {
      return;
    }

    final next = List<TaskModel>.from(_cachedTasks);
    final index = next.indexWhere((task) => task.id == taskId);
    if (index < 0) {
      return;
    }

    next[index] = next[index].copyWith(
      acceptedByUserId: acceptedBy,
      acceptedAt: DateTime.now(),
      clearPendingAcceptance: true,
    );
    _cachedTasks = next;
    _state = ViewState<List<TaskModel>>.success(next);
    notifyListeners();
  }

  void _applyTaskAcceptanceRequested(Map<String, dynamic> data) {
    final taskId = data['taskId'];
    final pendingAcceptanceBy = data['pendingAcceptanceBy'];
    if (taskId is! String || pendingAcceptanceBy is! String) {
      return;
    }

    final next = List<TaskModel>.from(_cachedTasks);
    final index = next.indexWhere((task) => task.id == taskId);
    if (index < 0) {
      return;
    }

    next[index] = next[index].copyWith(
      pendingAcceptanceByUserId: pendingAcceptanceBy,
      pendingAcceptanceAt: DateTime.now(),
    );
    _cachedTasks = next;
    _state = ViewState<List<TaskModel>>.success(next);
    notifyListeners();
  }

  void _applyTaskAcceptanceDeclined(Map<String, dynamic> data) {
    final taskId = data['taskId'];
    if (taskId is! String) {
      return;
    }

    final next = List<TaskModel>.from(_cachedTasks);
    final index = next.indexWhere((task) => task.id == taskId);
    if (index < 0) {
      return;
    }

    next[index] = next[index].copyWith(clearPendingAcceptance: true);
    _cachedTasks = next;
    _state = ViewState<List<TaskModel>>.success(next);
    notifyListeners();
  }

  Future<void> applySort(TaskSortType sortType) async {
    _selectedSort = sortType;
    await loadTasks();
  }

  Future<bool> createTask({
    required String title,
    required String description,
    required String location,
    required double price,
    required DateTime scheduledAt,
    required TaskExecutionMode executionMode,
    required String postedByUserId,
    required String postedByName,
  }) async {
    _isCreating = true;
    notifyListeners();

    try {
      final createdTask = await _taskService.createTask(
        title: title,
        description: description,
        location: location,
        price: price,
        scheduledAt: scheduledAt,
        executionMode: executionMode,
        postedByUserId: postedByUserId,
        postedByName: postedByName,
      );

      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      if (refreshed.isEmpty) {
        _cachedTasks = [createdTask];
        _state = ViewState<List<TaskModel>>.success(_cachedTasks);
      } else {
        _cachedTasks = refreshed;
        _state = ViewState<List<TaskModel>>.success(_cachedTasks);
      }

      _isCreating = false;
      notifyListeners();
      return true;
    } catch (_) {
      _isCreating = false;
      notifyListeners();
      return false;
    }
  }

  Future<AcceptTaskOutcome> acceptTask({
    required String taskId,
    required String userId,
  }) async {
    try {
      final result =
          await _taskService.acceptTask(taskId: taskId, userId: userId);
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskAcceptResult.accepted:
          return AcceptTaskOutcome.accepted;
        case TaskAcceptResult.pendingApproval:
          return AcceptTaskOutcome.pendingApproval;
        case TaskAcceptResult.ownTask:
          return AcceptTaskOutcome.ownTask;
        case TaskAcceptResult.alreadyAccepted:
          return AcceptTaskOutcome.alreadyAccepted;
        case TaskAcceptResult.notFound:
          return AcceptTaskOutcome.notFound;
      }
    } catch (_) {
      return AcceptTaskOutcome.failed;
    }
  }

  Future<TaskAcceptanceDecisionOutcome> confirmTaskAcceptance({
    required String taskId,
    required String ownerUserId,
  }) async {
    try {
      final result = await _taskService.confirmTaskAcceptance(
        taskId: taskId,
        ownerUserId: ownerUserId,
      );
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskAcceptanceDecisionResult.accepted:
          return TaskAcceptanceDecisionOutcome.accepted;
        case TaskAcceptanceDecisionResult.declined:
          return TaskAcceptanceDecisionOutcome.declined;
        case TaskAcceptanceDecisionResult.notFound:
          return TaskAcceptanceDecisionOutcome.notFound;
        case TaskAcceptanceDecisionResult.notTaskOwner:
          return TaskAcceptanceDecisionOutcome.notTaskOwner;
        case TaskAcceptanceDecisionResult.noPendingRequest:
          return TaskAcceptanceDecisionOutcome.noPendingRequest;
        case TaskAcceptanceDecisionResult.alreadyAccepted:
          return TaskAcceptanceDecisionOutcome.alreadyAccepted;
      }
    } catch (_) {
      return TaskAcceptanceDecisionOutcome.failed;
    }
  }

  Future<TaskAcceptanceDecisionOutcome> declineTaskAcceptance({
    required String taskId,
    required String ownerUserId,
  }) async {
    try {
      final result = await _taskService.declineTaskAcceptance(
        taskId: taskId,
        ownerUserId: ownerUserId,
      );
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskAcceptanceDecisionResult.accepted:
          return TaskAcceptanceDecisionOutcome.accepted;
        case TaskAcceptanceDecisionResult.declined:
          return TaskAcceptanceDecisionOutcome.declined;
        case TaskAcceptanceDecisionResult.notFound:
          return TaskAcceptanceDecisionOutcome.notFound;
        case TaskAcceptanceDecisionResult.notTaskOwner:
          return TaskAcceptanceDecisionOutcome.notTaskOwner;
        case TaskAcceptanceDecisionResult.noPendingRequest:
          return TaskAcceptanceDecisionOutcome.noPendingRequest;
        case TaskAcceptanceDecisionResult.alreadyAccepted:
          return TaskAcceptanceDecisionOutcome.alreadyAccepted;
      }
    } catch (_) {
      return TaskAcceptanceDecisionOutcome.failed;
    }
  }

  Future<RequestCompletionOutcome> requestTaskCompletion({
    required String taskId,
    required String helperUserId,
  }) async {
    try {
      final result = await _taskService.requestTaskCompletion(
        taskId: taskId,
        helperUserId: helperUserId,
      );
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskCompletionRequestResult.requested:
          return RequestCompletionOutcome.requested;
        case TaskCompletionRequestResult.notFound:
          return RequestCompletionOutcome.notFound;
        case TaskCompletionRequestResult.notAcceptedHelper:
          return RequestCompletionOutcome.notAcceptedHelper;
        case TaskCompletionRequestResult.alreadyCompleted:
          return RequestCompletionOutcome.alreadyCompleted;
      }
    } catch (_) {
      return RequestCompletionOutcome.failed;
    }
  }

  Future<ConfirmCompletionOutcome> confirmTaskCompletion({
    required String taskId,
    required String ownerUserId,
  }) async {
    try {
      final result = await _taskService.confirmTaskCompletion(
        taskId: taskId,
        ownerUserId: ownerUserId,
      );
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskCompletionConfirmResult.completed:
          return ConfirmCompletionOutcome.completed;
        case TaskCompletionConfirmResult.declined:
          return ConfirmCompletionOutcome.declined;
        case TaskCompletionConfirmResult.notFound:
          return ConfirmCompletionOutcome.notFound;
        case TaskCompletionConfirmResult.notTaskOwner:
          return ConfirmCompletionOutcome.notTaskOwner;
        case TaskCompletionConfirmResult.noPendingRequest:
          return ConfirmCompletionOutcome.noPendingRequest;
        case TaskCompletionConfirmResult.alreadyCompleted:
          return ConfirmCompletionOutcome.alreadyCompleted;
      }
    } catch (_) {
      return ConfirmCompletionOutcome.failed;
    }
  }

  Future<ConfirmCompletionOutcome> declineTaskCompletion({
    required String taskId,
    required String ownerUserId,
  }) async {
    try {
      final result = await _taskService.declineTaskCompletion(
        taskId: taskId,
        ownerUserId: ownerUserId,
      );
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskCompletionConfirmResult.completed:
          return ConfirmCompletionOutcome.completed;
        case TaskCompletionConfirmResult.declined:
          return ConfirmCompletionOutcome.declined;
        case TaskCompletionConfirmResult.notFound:
          return ConfirmCompletionOutcome.notFound;
        case TaskCompletionConfirmResult.notTaskOwner:
          return ConfirmCompletionOutcome.notTaskOwner;
        case TaskCompletionConfirmResult.noPendingRequest:
          return ConfirmCompletionOutcome.noPendingRequest;
        case TaskCompletionConfirmResult.alreadyCompleted:
          return ConfirmCompletionOutcome.alreadyCompleted;
      }
    } catch (_) {
      return ConfirmCompletionOutcome.failed;
    }
  }

  Future<SubmitRatingOutcome> submitTaskRating({
    required String taskId,
    required String ownerUserId,
    required double rating,
  }) async {
    try {
      final result = await _taskService.submitTaskRating(
        taskId: taskId,
        ownerUserId: ownerUserId,
        rating: rating,
      );
      final refreshed = await _taskService.fetchTasks(sortBy: _selectedSort);
      _cachedTasks = refreshed;
      _state = refreshed.isEmpty
          ? ViewState<List<TaskModel>>.empty(
              message: 'No tasks available right now.',
            )
          : ViewState<List<TaskModel>>.success(refreshed);
      notifyListeners();

      switch (result) {
        case TaskRatingResult.rated:
          return SubmitRatingOutcome.rated;
        case TaskRatingResult.notFound:
          return SubmitRatingOutcome.notFound;
        case TaskRatingResult.notTaskOwner:
          return SubmitRatingOutcome.notTaskOwner;
        case TaskRatingResult.notCompleted:
          return SubmitRatingOutcome.notCompleted;
        case TaskRatingResult.noPendingRating:
          return SubmitRatingOutcome.noPendingRating;
        case TaskRatingResult.invalidRating:
          return SubmitRatingOutcome.invalidRating;
      }
    } catch (_) {
      return SubmitRatingOutcome.failed;
    }
  }
}
