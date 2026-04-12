import 'package:frontend/models/message_model.dart';

class ChatModel {
  const ChatModel({
    required this.chatId,
    required this.users,
    required this.lastMessage,
  });

  final String chatId;
  final List<String> users;
  final MessageModel lastMessage;

  factory ChatModel.fromJson(Map<String, dynamic> json) {
    return ChatModel(
      chatId: json['chatId'] as String,
      users: (json['users'] as List<dynamic>).cast<String>(),
      lastMessage: MessageModel.fromJson(
        json['lastMessage'] as Map<String, dynamic>,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'chatId': chatId,
      'users': users,
      'lastMessage': lastMessage.toJson(),
    };
  }
}
