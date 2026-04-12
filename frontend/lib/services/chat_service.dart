import 'package:frontend/models/chat_model.dart';
import 'package:frontend/models/message_model.dart';
import 'package:frontend/services/test_data/chat_test_data.dart';
import 'package:frontend/services/test_data/message_test_data.dart';

class ChatService {
  Future<List<ChatModel>> fetchChats() async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return chatPreviewApiResponse
        .map(ChatModel.fromJson)
        .toList(growable: false);
  }

  Future<List<MessageModel>> fetchMessages() async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return messagePreviewApiResponse
        .map(MessageModel.fromJson)
        .toList(growable: false);
  }
}
