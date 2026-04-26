import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/chat_model.dart';
import 'package:frontend/models/message_model.dart';
import 'package:frontend/models/task_model.dart';
import 'package:frontend/services/chat_service.dart';

class ChatProvider extends ChangeNotifier {
  ChatProvider({ChatService? chatService})
      : _chatService = chatService ?? ChatService(),
        _state = ViewState<List<ChatModel>>.loading();

  final ChatService _chatService;

  ViewState<List<ChatModel>> _state;
  ViewState<List<ChatModel>> get state => _state;
  ViewState<List<MessageModel>> _messagesState =
      ViewState<List<MessageModel>>.empty();
  ViewState<List<MessageModel>> get messagesState => _messagesState;
  final Map<String, List<MessageModel>> _messagesByChatId = {};
  bool _isSendingMessage = false;
  String? _activeChatId;
  bool get isSendingMessage => _isSendingMessage;

  void reset() {
    _state = ViewState<List<ChatModel>>.empty(message: 'No chats yet.');
    _messagesState = ViewState<List<MessageModel>>.empty();
    _messagesByChatId.clear();
    _activeChatId = null;
    _isSendingMessage = false;
    notifyListeners();
  }

  void applyRealtimeEvent(dynamic event) {
    if (event is! Map) {
      return;
    }

    final type = event['type'];
    final data = event['data'];
    if (type != 'NEW_MESSAGE' || data is! Map) {
      return;
    }

    final rawChat = data['chat'];
    if (rawChat is Map) {
      _upsertChatModel(ChatModel.fromJson(Map<String, dynamic>.from(rawChat)));
    }

    final message = MessageModel.fromJson(Map<String, dynamic>.from(data));
    _upsertRealtimeMessage(message);
  }

  Future<void> loadChats() async {
    _state = ViewState<List<ChatModel>>.loading(previousData: _state.data);
    notifyListeners();

    try {
      final chats = await _chatService.fetchChats();
      if (chats.isEmpty) {
        _state = ViewState<List<ChatModel>>.empty(message: 'No chats yet.');
      } else {
        _state = ViewState<List<ChatModel>>.success(chats);
      }
    } catch (_) {
      _state = ViewState<List<ChatModel>>.error(
        'Unable to load chats right now.',
      );
    }

    notifyListeners();
  }

  Future<void> loadMessages(String chatId) async {
    final previousMessages = _messagesByChatId[chatId];
    _activeChatId = chatId;
    _messagesState = ViewState<List<MessageModel>>.loading(
      previousData: previousMessages,
    );
    notifyListeners();

    try {
      final fetchedMessages = await _chatService.fetchMessages(chatId);
      final mergedMessages = _mergeMessageList(
        previousMessages ?? const [],
        fetchedMessages,
      );
      _messagesByChatId[chatId] = mergedMessages;
      if (mergedMessages.isEmpty) {
        _messagesState = ViewState<List<MessageModel>>.empty(
          message: 'No messages yet.',
        );
      } else {
        _messagesState = ViewState<List<MessageModel>>.success(mergedMessages);
      }
    } catch (_) {
      _messagesState = ViewState<List<MessageModel>>.error(
        'Unable to load messages right now.',
        previousData: previousMessages,
      );
    }

    notifyListeners();
  }

  Future<void> sendMessage({
    required String chatId,
    required String taskId,
    required String senderId,
    required String text,
    String? imageDataUrl,
    bool isPaymentRequest = false,
  }) async {
    if (_isSendingMessage) {
      return;
    }

    final trimmed = text.trim();
    if (trimmed.isEmpty) {
      return;
    }

    _isSendingMessage = true;
    notifyListeners();

    try {
      final created = await _chatService.sendMessage(
        chatId: chatId,
        taskId: taskId,
        senderId: senderId,
        text: trimmed,
        imageDataUrl: imageDataUrl,
        isPaymentRequest: isPaymentRequest,
      );

      final nextMessages = _mergeMessages(
        _messagesByChatId[chatId] ?? const [],
        created,
      );
      _messagesByChatId[chatId] = nextMessages;
      if (_activeChatId == chatId) {
        _messagesState = ViewState<List<MessageModel>>.success(nextMessages);
      }

      final chats = List<ChatModel>.from(_state.data ?? const []);
      final chatIndex = chats.indexWhere((chat) => chat.chatId == chatId);
      if (chatIndex >= 0) {
        final current = chats[chatIndex];
        chats[chatIndex] = ChatModel(
          chatId: current.chatId,
          taskId: current.taskId,
          taskTitle: current.taskTitle,
          taskOwnerUserId: current.taskOwnerUserId,
          taskOwnerName: current.taskOwnerName,
          users: current.users,
          isClosed: current.isClosed,
          lastMessage: created,
        );
        _state = ViewState<List<ChatModel>>.success(chats);
      } else {
        await loadChats();
      }
    } finally {
      _isSendingMessage = false;
      notifyListeners();
    }
  }

  Future<ChatModel?> openOrCreateTaskChat({
    required TaskModel task,
    required String helperUserId,
  }) async {
    try {
      final chat = await _chatService.getOrCreateTaskChat(
        task: task,
        helperUserId: helperUserId,
      );

      final currentChats = List<ChatModel>.from(_state.data ?? const []);
      final existingIndex =
          currentChats.indexWhere((item) => item.chatId == chat.chatId);
      if (existingIndex >= 0) {
        currentChats[existingIndex] = chat;
      } else {
        currentChats.insert(0, chat);
      }
      _state = ViewState<List<ChatModel>>.success(currentChats);
      notifyListeners();
      return chat;
    } catch (_) {
      return null;
    }
  }

  void _upsertRealtimeMessage(MessageModel message) {
    final nextMessages = _mergeMessages(
      _messagesByChatId[message.chatId] ?? const [],
      message,
    );
    _messagesByChatId[message.chatId] = nextMessages;

    if (_activeChatId == message.chatId) {
      _messagesState = ViewState<List<MessageModel>>.success(nextMessages);
    }

    final chats = List<ChatModel>.from(_state.data ?? const []);
    final chatIndex = chats.indexWhere((chat) => chat.chatId == message.chatId);
    if (chatIndex >= 0) {
      final current = chats[chatIndex];
      chats[chatIndex] = ChatModel(
        chatId: current.chatId,
        taskId: current.taskId,
        taskTitle: current.taskTitle,
        taskOwnerUserId: current.taskOwnerUserId,
        taskOwnerName: current.taskOwnerName,
        users: current.users,
        isClosed: current.isClosed,
        lastMessage: message,
      );
      _state = ViewState<List<ChatModel>>.success(chats);
    } else {
      loadChats();
    }

    notifyListeners();
  }

  void _upsertChatModel(ChatModel chat) {
    final chats = List<ChatModel>.from(_state.data ?? const []);
    final chatIndex = chats.indexWhere((item) => item.chatId == chat.chatId);
    if (chatIndex < 0) {
      chats.insert(0, chat);
    } else {
      chats[chatIndex] = chat;
    }

    _state = ViewState<List<ChatModel>>.success(chats);
  }

  List<MessageModel> _mergeMessages(
    List<MessageModel> existing,
    MessageModel incoming,
  ) {
    final next = List<MessageModel>.from(existing);
    final messageIndex = next.indexWhere((item) => item.id == incoming.id);
    if (messageIndex < 0) {
      next.add(incoming);
    } else {
      next[messageIndex] = incoming;
    }

    next.sort((left, right) => left.timestamp.compareTo(right.timestamp));
    return next;
  }

  List<MessageModel> _mergeMessageList(
    List<MessageModel> existing,
    List<MessageModel> incoming,
  ) {
    var next = List<MessageModel>.from(existing);
    for (final message in incoming) {
      next = _mergeMessages(next, message);
    }
    return next;
  }
}
