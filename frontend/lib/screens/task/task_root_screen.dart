import 'package:flutter/material.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/screens/home/home_screen.dart';
import 'package:frontend/screens/task/task_post_screen.dart';

class TaskRootScreen extends StatefulWidget {
  const TaskRootScreen({
    super.key,
    required this.taskProvider,
    required this.authProvider,
  });

  static const String routeName = '/tasks';

  final TaskProvider taskProvider;
  final AuthProvider authProvider;

  @override
  State<TaskRootScreen> createState() => _TaskRootScreenState();
}

class _TaskRootScreenState extends State<TaskRootScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        taskProvider: widget.taskProvider,
        authProvider: widget.authProvider,
        showAppBar: false,
        showCreateShortcut: false,
      ),
      TaskPostScreen(
        taskProvider: widget.taskProvider,
        authProvider: widget.authProvider,
        showAppBar: false,
        closeOnSuccess: false,
        onTaskCreated: () {
          setState(() {
            _selectedIndex = 0;
          });
        },
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        title: Text(_selectedIndex == 0 ? 'Tasks' : 'Create task'),
        actions: [
          IconButton(
            onPressed: () => AppRoutes.goToTaskHistory(context),
            icon: const Icon(Icons.history_outlined),
            tooltip: 'History',
          ),
          IconButton(
            onPressed: () => AppRoutes.goToChat(context),
            icon: const Icon(Icons.chat_bubble_outline),
            tooltip: 'Chats',
          ),
          IconButton(
            onPressed: () => AppRoutes.goToProfile(context),
            icon: const Icon(Icons.person_outline),
            tooltip: 'Profile',
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'View',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle),
            label: 'Create',
          ),
        ],
        onDestinationSelected: (value) {
          if (value == 1 && widget.authProvider.state.data == null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Please login first to create a task.'),
              ),
            );
            return;
          }

          setState(() {
            _selectedIndex = value;
          });
        },
      ),
    );
  }
}
