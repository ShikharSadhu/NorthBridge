class TaskModel {
  const TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.location,
    required this.price,
    required this.distanceKm,
    required this.scheduledAt,
  });

  final String id;
  final String title;
  final String description;
  final String location;
  final double price;
  final double distanceKm;
  final DateTime scheduledAt;

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      location: json['location'] as String,
      price: (json['price'] as num).toDouble(),
      distanceKm: (json['distanceKm'] as num).toDouble(),
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'location': location,
      'price': price,
      'distanceKm': distanceKm,
      'scheduledAt': scheduledAt.toIso8601String(),
    };
  }
}
