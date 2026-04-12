class UserModel {
  const UserModel({
    required this.id,
    required this.name,
    required this.rating,
    required this.location,
  });

  final String id;
  final String name;
  final double rating;
  final String location;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      rating: (json['rating'] as num).toDouble(),
      location: json['location'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'rating': rating,
      'location': location,
    };
  }
}
