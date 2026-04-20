import 'package:flutter/material.dart';
import 'package:frontend/core/theme/app_theme.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/chat_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/services/location_service.dart';

void main() {
  runApp(const NorthBridgeApp());
}

class NorthBridgeApp extends StatefulWidget {
  const NorthBridgeApp({super.key});

  @override
  State<NorthBridgeApp> createState() => _NorthBridgeAppState();
}

class _NorthBridgeAppState extends State<NorthBridgeApp> {
  late final TaskProvider _taskProvider;
  late final AuthProvider _authProvider;
  late final ChatProvider _chatProvider;
  late final LocationService _locationService;

  @override
  void initState() {
    super.initState();
    _taskProvider = TaskProvider();
    _taskProvider.loadTasks();
    _locationService = LocationService();
    _bootstrapAcceptorLocation();
    _authProvider = AuthProvider();
    _authProvider.loadCurrentUser();
    _chatProvider = ChatProvider();
    _chatProvider.loadChats();
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
    _taskProvider.dispose();
    _authProvider.dispose();
    _chatProvider.dispose();
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
