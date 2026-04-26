import 'package:frontend/models/message_model.dart';

class ChatModel {
  const ChatModel({
    required this.chatId,
    required this.taskId,
    required this.taskTitle,
    required this.taskOwnerUserId,
    required this.taskOwnerName,
    required this.users,
    required this.isClosed,
    required this.lastMessage,
  });

  final String chatId;
  final String taskId;
  final String taskTitle;
  final String taskOwnerUserId;
  final String taskOwnerName;
  final List<String> users;
  final bool isClosed;
  final MessageModel lastMessage;

  factory ChatModel.fromJson(Map<String, dynamic> json) {
    return ChatModel(
      chatId: json['chatId'] as String,
      taskId: json['taskId'] as String,
      taskTitle: json['taskTitle'] as String,
      taskOwnerUserId: json['taskOwnerUserId'] as String,
      taskOwnerName: json['taskOwnerName'] as String,
      users: (json['users'] as List<dynamic>).cast<String>(),
      isClosed: json['isClosed'] as bool? ?? false,
      lastMessage: MessageModel.fromJson(
        json['lastMessage'] as Map<String, dynamic>,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'chatId': chatId,
      'taskId': taskId,
      'taskTitle': taskTitle,
      'taskOwnerUserId': taskOwnerUserId,
      'taskOwnerName': taskOwnerName,
      'users': users,
      'isClosed': isClosed,
      'lastMessage': lastMessage.toJson(),
    };
  }
}
