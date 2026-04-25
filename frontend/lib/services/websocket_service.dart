import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:frontend/services/auth_service.dart';

class WebSocketService {
  WebSocketService._internal();
  static final WebSocketService instance = WebSocketService._internal();

  WebSocketChannel? _channel;
  final StreamController<dynamic> _messageController = StreamController.broadcast();
  Timer? _heartbeatTimer;
  int _reconnectAttempts = 0;

  Stream<dynamic> get messages => _messageController.stream;

  String _defaultWsBase() {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'ws://10.0.2.2:3000';
    }
    return 'ws://localhost:3000';
  }

  Future<void> connect({String? token, bool override = false}) async {
    if (_channel != null) return;

    final auth = AuthService();
    final resolved = token ?? await auth.getIdToken();

    final base = _defaultWsBase();
    final shouldOverride = override || (resolved == null && kDebugMode);
    final uri = (resolved != null && resolved.trim().isNotEmpty)
      ? Uri.parse('$base/?token=${Uri.encodeComponent(resolved)}')
      : (shouldOverride ? Uri.parse('$base/?x-user-id=dev') : Uri.parse(base));

    try {
      _channel = WebSocketChannel.connect(uri);
      _reconnectAttempts = 0;

      _channel!.stream.listen((event) {
        try {
          final parsed = jsonDecode(event as String);
          _messageController.add(parsed);
        } catch (_) {
          _messageController.add(event);
        }
      }, onDone: _handleDone, onError: _handleError, cancelOnError: true);

      _startHeartbeat();
    } catch (e) {
      _messageController.add({'type': 'ERROR', 'error': e.toString()});
      _attemptReconnect();
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      try {
        _channel?.sink.add(jsonEncode({'type': 'PING'}));
      } catch (_) {}
    });
  }

  void _handleDone() {
    _messageController.add({'type': 'CLOSED'});
    _cleanupChannel();
    _attemptReconnect();
  }

  void _handleError(Object error) {
    _messageController.add({'type': 'ERROR', 'error': error.toString()});
    _cleanupChannel();
    _attemptReconnect();
  }

  void _cleanupChannel() {
    try {
      _heartbeatTimer?.cancel();
      _channel?.sink.close();
    } catch (_) {}
    _channel = null;
  }

  void _attemptReconnect() {
    _reconnectAttempts = math.min(6, _reconnectAttempts + 1);
    final wait = math.min(60, math.pow(2, _reconnectAttempts)).toInt();
    Timer(Duration(seconds: wait), () => connect());
  }

  Future<void> send(String type, dynamic data) async {
    if (_channel == null) return;
    final msg = jsonEncode({'type': type, 'data': data});
    _channel!.sink.add(msg);
  }

  Future<void> disconnect() async {
    _heartbeatTimer?.cancel();
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _channel = null;
  }
}
