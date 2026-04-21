import 'package:frontend/models/chat_model.dart';
import 'package:frontend/models/message_model.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/api_service.dart';

class ChatService {
  ChatService({ApiService? apiService}) : _apiService = apiService ?? ApiService();

  final ApiService _apiService;

  List<Map<String, dynamic>> _chatStore = const [];
  List<Map<String, dynamic>> _messageStore = const [];

  Future<List<ChatModel>> fetchChats() async {
    try {
      final response = await _apiService.getJson('/v1/chats');
      final rawChats = (response['chats'] as List<dynamic>? ?? const <dynamic>[])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList(growable: false);

      _chatStore = rawChats;
      return rawChats.map(ChatModel.fromJson).toList(growable: false);
    } catch (_) {
      if (_chatStore.isEmpty) {
        rethrow;
      }

      return _chatStore.map(ChatModel.fromJson).toList(growable: false);
    }
  }

  Future<List<MessageModel>> fetchMessages(String chatId) async {
    try {
      final response = await _apiService.getJson('/v1/chats/$chatId/messages');
      final rawMessages =
          (response['messages'] as List<dynamic>? ?? const <dynamic>[])
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList(growable: false);

      if (response['chat'] is Map) {
        _upsertChatCache(response['chat']);
      }

      _messageStore = _upsertMessagesForChat(
        chatId: chatId,
        rawMessages: rawMessages,
      );
      return rawMessages.map(MessageModel.fromJson).toList(growable: false);
    } catch (_) {
      if (_messageStore.isEmpty) {
        rethrow;
      }

      return _messageStore
          .map(MessageModel.fromJson)
          .where((message) => message.chatId == chatId)
          .toList(growable: false);
    }
  }

  Future<MessageModel> sendMessage({
    required String chatId,
    required String taskId,
    required String senderId,
    required String text,
    String? imageDataUrl,
    bool isPaymentRequest = false,
  }) async {
    final response = await _apiService.postJson(
      '/v1/chats/$chatId/messages',
      body: {
        'taskId': taskId,
        'senderId': senderId,
        'text': text,
        'imageDataUrl': imageDataUrl,
        'isPaymentRequest': isPaymentRequest,
      },
    );

    if (response['message'] is Map) {
      final message = MessageModel.fromJson(
        Map<String, dynamic>.from(response['message'] as Map),
      );
      _messageStore = [
        ..._messageStore.where((item) => item['id'] != message.id),
        message.toJson(),
      ];
      _updateChatLastMessage(chatId: chatId, message: message);
      return message;
    }

    throw Exception('Invalid message response.');
  }

  Future<ChatModel> getOrCreateTaskChat({
    required TaskModel task,
    required String helperUserId,
  }) async {
    final response = await _apiService.postJson(
      '/v1/chats/task',
      body: {
        'helperUserId': helperUserId,
        'task': {
          'id': task.id,
          'postedByUserId': task.postedByUserId,
          'postedByName': task.postedByName,
          'title': task.title,
        },
      },
    );

    if (response['chat'] is Map) {
      final chat = ChatModel.fromJson(
        Map<String, dynamic>.from(response['chat'] as Map),
      );
      _upsertChatCache(chat.toJson());
      _messageStore = [
        ..._messageStore.where((item) => item['chatId'] != chat.chatId),
        chat.lastMessage.toJson(),
      ];
      return chat;
    }

    throw Exception('Invalid chat response.');
  }

  void _updateChatLastMessage({
    required String chatId,
    required MessageModel message,
  }) {
    final chatIndex = _chatStore.indexWhere((chat) => chat['chatId'] == chatId);
    if (chatIndex < 0) {
      return;
    }

    final updated = Map<String, dynamic>.from(_chatStore[chatIndex]);
    updated['lastMessage'] = message.toJson();

    final next = List<Map<String, dynamic>>.from(_chatStore);
    next[chatIndex] = updated;
    _chatStore = next;
  }

  void _upsertChatCache(dynamic rawChat) {
    if (rawChat is! Map) {
      return;
    }

    final chatMap = Map<String, dynamic>.from(rawChat);
    final chatId = chatMap['chatId'];
    if (chatId is! String || chatId.isEmpty) {
      return;
    }

    final index = _chatStore.indexWhere((chat) => chat['chatId'] == chatId);
    if (index < 0) {
      _chatStore = [chatMap, ..._chatStore];
      return;
    }

    final next = List<Map<String, dynamic>>.from(_chatStore);
    next[index] = chatMap;
    _chatStore = next;
  }

  List<Map<String, dynamic>> _upsertMessagesForChat({
    required String chatId,
    required List<Map<String, dynamic>> rawMessages,
  }) {
    final others = _messageStore.where((msg) => msg['chatId'] != chatId);
    return [
      ...others,
      ...rawMessages,
    ];
  }
}
