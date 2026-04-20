import 'package:frontend/models/task_mode.dart';

class TaskLocationGeo {
  const TaskLocationGeo({
    required this.lat,
    required this.lng,
  });

  final double lat;
  final double lng;

  factory TaskLocationGeo.fromJson(Map<String, dynamic> json) {
    return TaskLocationGeo(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lat': lat,
      'lng': lng,
    };
  }
}

class TaskModel {
  const TaskModel({
    required this.id,
    required this.postedByUserId,
    required this.postedByName,
    required this.title,
    required this.description,
    required this.location,
    required this.price,
    required this.distanceKm,
    required this.scheduledAt,
    required this.executionMode,
    this.isActive = true,
    this.completionRequestedByUserId,
    this.completionRequestedAt,
    this.completedByUserId,
    this.completedAt,
    this.isRatingPending = false,
    this.completionRating,
    this.ratedAt,
    this.acceptedByUserId,
    this.acceptedAt,
    this.locationGeo,
  });

  final String id;
  final String postedByUserId;
  final String postedByName;
  final String title;
  final String description;
  final String location;
  final double price;
  final double distanceKm;
  final DateTime scheduledAt;
  final TaskExecutionMode executionMode;
  final bool isActive;
  final String? completionRequestedByUserId;
  final DateTime? completionRequestedAt;
  final String? completedByUserId;
  final DateTime? completedAt;
  final bool isRatingPending;
  final double? completionRating;
  final DateTime? ratedAt;
  final String? acceptedByUserId;
  final DateTime? acceptedAt;
  final TaskLocationGeo? locationGeo;

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String,
      postedByUserId: json['postedByUserId'] as String,
      postedByName: json['postedByName'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      location: json['location'] as String,
      price: (json['price'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num).toDouble(),
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      executionMode:
          TaskExecutionMode.fromValue(json['executionMode'] as String?),
        isActive: json['isActive'] as bool? ?? true,
        completionRequestedByUserId:
          json['completionRequestedByUserId'] as String?,
        completionRequestedAt: (json['completionRequestedAt'] as String?) == null
          ? null
          : DateTime.parse(json['completionRequestedAt'] as String),
        completedByUserId: json['completedByUserId'] as String?,
        completedAt: (json['completedAt'] as String?) == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
        isRatingPending: json['isRatingPending'] as bool? ?? false,
        completionRating: (json['completionRating'] as num?)?.toDouble(),
        ratedAt: (json['ratedAt'] as String?) == null
          ? null
          : DateTime.parse(json['ratedAt'] as String),
      acceptedByUserId: json['acceptedByUserId'] as String?,
      acceptedAt: (json['acceptedAt'] as String?) == null
          ? null
          : DateTime.parse(json['acceptedAt'] as String),
        locationGeo:
          json['locationGeo'] is Map<String, dynamic>
            ? TaskLocationGeo.fromJson(json['locationGeo'] as Map<String, dynamic>)
            : null,
    );
  }

  TaskModel copyWith({
    String? id,
    String? postedByUserId,
    String? postedByName,
    String? title,
    String? description,
    String? location,
    double? price,
    double? distanceKm,
    DateTime? scheduledAt,
    TaskExecutionMode? executionMode,
    bool? isActive,
    String? completionRequestedByUserId,
    DateTime? completionRequestedAt,
    String? completedByUserId,
    DateTime? completedAt,
    bool? isRatingPending,
    double? completionRating,
    DateTime? ratedAt,
    String? acceptedByUserId,
    DateTime? acceptedAt,
    TaskLocationGeo? locationGeo,
    bool clearAcceptance = false,
    bool clearCompletionRequest = false,
  }) {
    return TaskModel(
      id: id ?? this.id,
      postedByUserId: postedByUserId ?? this.postedByUserId,
      postedByName: postedByName ?? this.postedByName,
      title: title ?? this.title,
      description: description ?? this.description,
      location: location ?? this.location,
      price: price ?? this.price,
      distanceKm: distanceKm ?? this.distanceKm,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      executionMode: executionMode ?? this.executionMode,
        isActive: isActive ?? this.isActive,
        completionRequestedByUserId: clearCompletionRequest
          ? null
          : (completionRequestedByUserId ?? this.completionRequestedByUserId),
        completionRequestedAt: clearCompletionRequest
          ? null
          : (completionRequestedAt ?? this.completionRequestedAt),
        completedByUserId: completedByUserId ?? this.completedByUserId,
        completedAt: completedAt ?? this.completedAt,
        isRatingPending: isRatingPending ?? this.isRatingPending,
        completionRating: completionRating ?? this.completionRating,
        ratedAt: ratedAt ?? this.ratedAt,
      acceptedByUserId:
          clearAcceptance ? null : (acceptedByUserId ?? this.acceptedByUserId),
      acceptedAt: clearAcceptance ? null : (acceptedAt ?? this.acceptedAt),
      locationGeo: locationGeo ?? this.locationGeo,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'postedByUserId': postedByUserId,
      'postedByName': postedByName,
      'title': title,
      'description': description,
      'location': location,
      'price': price,
      'distanceKm': distanceKm,
      'scheduledAt': scheduledAt.toIso8601String(),
      'executionMode': executionMode.storageValue,
      'isActive': isActive,
      'completionRequestedByUserId': completionRequestedByUserId,
      'completionRequestedAt': completionRequestedAt?.toIso8601String(),
      'completedByUserId': completedByUserId,
      'completedAt': completedAt?.toIso8601String(),
      'isRatingPending': isRatingPending,
      'completionRating': completionRating,
      'ratedAt': ratedAt?.toIso8601String(),
      'acceptedByUserId': acceptedByUserId,
      'acceptedAt': acceptedAt?.toIso8601String(),
      'locationGeo': locationGeo?.toJson(),
    };
  }
}
