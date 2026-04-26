import 'dart:async';

import 'package:flutter/material.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/chat_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/services/location_service.dart';
import 'package:frontend/services/websocket_service.dart';

void main() {
  runApp(const NorthBridgeApp());
}

class NorthBridgeApp extends StatefulWidget {
  const NorthBridgeApp({super.key});

  @override
  State<NorthBridgeApp> createState() => _NorthBridgeAppState();
}

class _NorthBridgeAppState extends State<NorthBridgeApp>
    with WidgetsBindingObserver {
  late final TaskProvider _taskProvider;
  late final AuthProvider _authProvider;
  late final ChatProvider _chatProvider;
  late final LocationService _locationService;
  StreamSubscription<dynamic>? _webSocketSubscription;
  String? _lastChatUserId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _taskProvider = TaskProvider();
    _taskProvider.loadTasks();
    _locationService = LocationService();
    _bootstrapAcceptorLocation();
    _chatProvider = ChatProvider();
    _authProvider = AuthProvider();
    _authProvider.addListener(_syncChatStateWithAuth);
    _authProvider.loadCurrentUser().whenComplete(() {
      _syncChatStateWithAuth();
      _initWebSocket();
    });
  }

  void _syncChatStateWithAuth() {
    final currentUserId = _authProvider.state.data?.id;
    if (_lastChatUserId == currentUserId) {
      return;
    }

    _lastChatUserId = currentUserId;
    if (currentUserId == null || currentUserId.isEmpty) {
      _chatProvider.reset();
      return;
    }

    _chatProvider.loadChats();
  }

  void _initWebSocket() {
    // Attempt to connect; WebSocketService will try to obtain ID token via AuthService.
    WebSocketService.instance.connect().catchError((e) {
      // ignore connect errors here — service will attempt reconnects
      debugPrint('WebSocket connect error: $e');
    });

    _webSocketSubscription?.cancel();
    _webSocketSubscription = WebSocketService.instance.messages.listen((msg) {
      debugPrint('WS message: $msg');
      _taskProvider.applyRealtimeEvent(msg);
      _chatProvider.applyRealtimeEvent(msg);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      return;
    }

    _initWebSocket();
    _taskProvider.loadTasks();
    _authProvider.loadCurrentUser();
    if ((_authProvider.state.data?.id ?? '').isNotEmpty) {
      _chatProvider.loadChats();
    }
  }

  Future<void> _bootstrapAcceptorLocation() async {
    final location = await _locationService.tryGetCurrentLocation();
    if (!mounted || location == null) {
      return;
    }

    _taskProvider.setAcceptorLocation(lat: location.lat, lng: location.lng);
    await _taskProvider.loadTasks();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authProvider.removeListener(_syncChatStateWithAuth);
    _taskProvider.dispose();
    _authProvider.dispose();
    _chatProvider.dispose();
    _webSocketSubscription?.cancel();
    WebSocketService.instance.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      initialRoute: AppRoutes.initialRoute,
      routes: AppRoutes.routes(
        taskProvider: _taskProvider,
        authProvider: _authProvider,
        chatProvider: _chatProvider,
      ),
      onGenerateRoute: (settings) => AppRoutes.onGenerateRoute(
        settings,
        taskProvider: _taskProvider,
        authProvider: _authProvider,
        chatProvider: _chatProvider,
      ),
    );
  }
}
