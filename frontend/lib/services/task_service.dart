import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/test_data/task_test_data.dart';

class TaskService {
  Future<List<TaskModel>> fetchTasks() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return taskPreviewApiResponse
        .map(TaskModel.fromJson)
        .toList(growable: false);
  }

  Future<TaskModel> createTask({
    required String title,
    required String description,
    required String location,
    required double price,
    required DateTime scheduledAt,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));

    return TaskModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      description: description,
      location: location,
      price: price,
      distanceKm: 0,
      scheduledAt: scheduledAt,
    );
  }

  Future<Map<String, dynamic>> processVoiceInput(String text) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));

    final cleaned = text.trim();
    final words =
        cleaned.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final priceMatch = RegExp(r'(\d+(?:\.\d+)?)').firstMatch(cleaned);
    final parsedPrice = double.tryParse(priceMatch?.group(1) ?? '');

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
      'location':
          parsedLocation?.isNotEmpty == true ? parsedLocation : 'Add location',
      'price': parsedPrice ?? 0,
      'scheduledAt':
          DateTime.now().add(const Duration(hours: 1)).toIso8601String(),
    };
  }
}
