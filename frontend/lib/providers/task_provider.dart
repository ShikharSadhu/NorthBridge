import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/task_service.dart';

class TaskProvider extends ChangeNotifier {
  TaskProvider({TaskService? taskService})
      : _taskService = taskService ?? TaskService(),
        _state = ViewState<List<TaskModel>>.loading();

  final TaskService _taskService;

  ViewState<List<TaskModel>> _state;
  List<TaskModel> _cachedTasks = const [];
  String? _transientError;
  bool _isCreating = false;

  ViewState<List<TaskModel>> get state => _state;
  List<TaskModel> get tasks => _state.data ?? const [];
  bool get hasCachedData => _cachedTasks.isNotEmpty;
  String? get transientError => _transientError;
  bool get isCreating => _isCreating;

  Future<void> loadTasks() async {
    _transientError = null;
    _state = ViewState<List<TaskModel>>.loading(previousData: _cachedTasks);
    notifyListeners();

    try {
      final fetchedTasks = await _taskService.fetchTasks();
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

  Future<bool> createTask({
    required String title,
    required String description,
    required String location,
    required double price,
    required DateTime scheduledAt,
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
      );

      final current = List<TaskModel>.from(_cachedTasks);
      current.insert(0, createdTask);
      _cachedTasks = current;
      _state = ViewState<List<TaskModel>>.success(_cachedTasks);

      _isCreating = false;
      notifyListeners();
      return true;
    } catch (_) {
      _isCreating = false;
      notifyListeners();
      return false;
    }
  }
}
