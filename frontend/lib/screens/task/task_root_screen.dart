import 'package:flutter/material.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/screens/home/home_screen.dart';
import 'package:frontend/screens/task/task_post_screen.dart';

class TaskRootScreen extends StatefulWidget {
  const TaskRootScreen({
    super.key,
    required this.taskProvider,
  });

  static const String routeName = '/tasks';

  final TaskProvider taskProvider;

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
        showAppBar: false,
        showCreateShortcut: false,
      ),
      TaskPostScreen(
        taskProvider: widget.taskProvider,
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
        title: Text(_selectedIndex == 0 ? 'Tasks' : 'Create task'),
        actions: [
          IconButton(
            onPressed: () => AppRoutes.goToAuth(context),
            icon: const Icon(Icons.person_outline),
            tooltip: 'Account',
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
          setState(() {
            _selectedIndex = value;
          });
        },
      ),
    );
  }
}
