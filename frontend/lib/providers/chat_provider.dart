import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/chat_model.dart';
import 'package:frontend/services/chat_service.dart';

class ChatProvider extends ChangeNotifier {
  ChatProvider({ChatService? chatService})
      : _chatService = chatService ?? ChatService(),
        _state = ViewState<List<ChatModel>>.loading();

  final ChatService _chatService;

  ViewState<List<ChatModel>> _state;
  ViewState<List<ChatModel>> get state => _state;

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
}
