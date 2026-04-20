import 'package:frontend/models/chat_model.dart';
import 'package:frontend/models/message_model.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/api_service.dart';
import 'package:frontend/services/test_data/chat_test_data.dart';
import 'package:frontend/services/test_data/message_test_data.dart';

class ChatService {
  ChatService({ApiService? apiService}) : _apiService = apiService ?? ApiService();

  final ApiService _apiService;

  static List<Map<String, dynamic>> _chatStore = chatPreviewApiResponse
      .map((chat) => Map<String, dynamic>.from(chat))
      .toList();
  static List<Map<String, dynamic>> _messageStore = messagePreviewApiResponse
      .map((message) => Map<String, dynamic>.from(message))
      .toList();

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
      await Future<void>.delayed(const Duration(milliseconds: 220));
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
      await Future<void>.delayed(const Duration(milliseconds: 220));
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
    try {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 250));

      final message = MessageModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        chatId: chatId,
        taskId: taskId,
        senderId: senderId,
        text: text,
        timestamp: DateTime.now().toUtc(),
        imageDataUrl: imageDataUrl,
        isPaymentRequest: isPaymentRequest,
      );

      _messageStore = [
        ..._messageStore,
        message.toJson(),
      ];

      _updateChatLastMessage(chatId: chatId, message: message);
      return message;
    }
  }

  Future<ChatModel> getOrCreateTaskChat({
    required TaskModel task,
    required String helperUserId,
  }) async {
    try {
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
    } catch (_) {
      await Future<void>.delayed(const Duration(milliseconds: 180));

      final existing = _chatStore.firstWhere(
        (chat) {
          final users = (chat['users'] as List<dynamic>).cast<String>();
          return chat['taskId'] == task.id &&
              users.contains(task.postedByUserId) &&
              users.contains(helperUserId);
        },
        orElse: () => const <String, dynamic>{},
      );

      if (existing.isNotEmpty) {
        return ChatModel.fromJson(existing);
      }

      final now = DateTime.now().toUtc();
      final chatId = 'c_${now.microsecondsSinceEpoch}';
      final firstMessage = MessageModel(
        id: 'm_${now.microsecondsSinceEpoch}',
        chatId: chatId,
        taskId: task.id,
        senderId: task.postedByUserId,
        text: 'Task accepted. Let\'s coordinate the details.',
        timestamp: now,
      );

      final newChat = ChatModel(
        chatId: chatId,
        taskId: task.id,
        taskTitle: task.title,
        taskOwnerUserId: task.postedByUserId,
        taskOwnerName: task.postedByName,
        users: [task.postedByUserId, helperUserId],
        lastMessage: firstMessage,
      );

      _messageStore = [
        ..._messageStore,
        firstMessage.toJson(),
      ];
      _chatStore = [
        newChat.toJson(),
        ..._chatStore,
      ];

      return newChat;
    }
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
