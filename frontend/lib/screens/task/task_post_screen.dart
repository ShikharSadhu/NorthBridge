import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/models/task_mode.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';
import 'package:frontend/widgets/app_text_field.dart';

class TaskPostScreen extends StatefulWidget {
  const TaskPostScreen({
    super.key,
    required this.taskProvider,
    required this.authProvider,
    this.showAppBar = true,
    this.closeOnSuccess = true,
    this.onTaskCreated,
  });

  static const String routeName = '/task/post';

  final TaskProvider taskProvider;
  final AuthProvider authProvider;
  final bool showAppBar;
  final bool closeOnSuccess;
  final VoidCallback? onTaskCreated;

  @override
  State<TaskPostScreen> createState() => _TaskPostScreenState();
}

class _TaskPostScreenState extends State<TaskPostScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _priceController = TextEditingController();

  late DateTime _selectedDateTime;
  TaskExecutionMode _selectedExecutionMode = TaskExecutionMode.offline;
  String? _formError;

  @override
  void initState() {
    super.initState();
    _selectedDateTime = DateTime.now().add(const Duration(hours: 1));
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _selectedDateTime = DateTime(
        picked.year,
        picked.month,
        picked.day,
        _selectedDateTime.hour,
        _selectedDateTime.minute,
      );
    });
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_selectedDateTime),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _selectedDateTime = DateTime(
        _selectedDateTime.year,
        _selectedDateTime.month,
        _selectedDateTime.day,
        picked.hour,
        picked.minute,
      );
    });
  }

  Future<void> _submit() async {
    if (widget.authProvider.state.data == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please login first to create a task.')),
      );
      return;
    }

    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();
    final location = _locationController.text.trim();
    final price = double.tryParse(_priceController.text.trim());

    if (title.isEmpty ||
        description.isEmpty ||
        location.isEmpty ||
        price == null) {
      setState(() {
        _formError = 'Please complete all fields with valid values.';
      });
      return;
    }

    setState(() {
      _formError = null;
    });

    final currentUser = widget.authProvider.state.data;
    if (currentUser == null) {
      setState(() {
        _formError = 'Please login first to create a task.';
      });
      return;
    }

    final created = await widget.taskProvider.createTask(
      title: title,
      description: description,
      location: location,
      price: price,
      scheduledAt: _selectedDateTime,
      executionMode: _selectedExecutionMode,
      postedByUserId: currentUser.id,
      postedByName: currentUser.name,
    );

    if (!mounted) {
      return;
    }

    if (created) {
      if (widget.closeOnSuccess) {
        Navigator.of(context).pop();
      } else {
        _titleController.clear();
        _descriptionController.clear();
        _locationController.clear();
        _priceController.clear();
        _selectedExecutionMode = TaskExecutionMode.offline;
        widget.onTaskCreated?.call();
      }
    } else {
      setState(() {
        _formError = 'Unable to create task. Please try again.';
      });
    }
  }

  Future<void> _openVoiceFlow() async {
    if (widget.authProvider.state.data == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please login first to create a task.')),
      );
      return;
    }

    final draft = await AppRoutes.goToVoiceInput(context);
    if (!mounted || draft == null) {
      return;
    }

    setState(() {
      _titleController.text = draft.title;
      _descriptionController.text = draft.description;
      _locationController.text = draft.location;
      _priceController.text = draft.price > 0 ? draft.price.toString() : '';
      _selectedDateTime = draft.scheduledAt;
      _selectedExecutionMode = draft.executionMode;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final content = Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: ListView(
          padding: AppSpacing.screenPadding,
          children: [
            Text(
              'Create a task',
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Add clear details so others can help quickly.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Padding(
                padding: AppSpacing.cardPadding,
                child: Column(
                  children: [
                    AppTextField(
                      label: 'Title',
                      hintText: 'What do you need help with?',
                      controller: _titleController,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(
                      label: 'Description',
                      hintText: 'Add relevant details',
                      controller: _descriptionController,
                      maxLines: 4,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(
                      label: 'Location',
                      hintText: 'Area or locality',
                      controller: _locationController,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    AppTextField(
                      label: 'Price',
                      hintText: 'e.g. 250',
                      controller: _priceController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    DropdownButtonFormField<TaskExecutionMode>(
                      value: _selectedExecutionMode,
                      decoration: const InputDecoration(
                        labelText: 'Mode',
                      ),
                      items: TaskExecutionMode.values
                          .map(
                            (mode) => DropdownMenuItem<TaskExecutionMode>(
                              value: mode,
                              child: Text(mode.displayLabel),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) {
                        if (value == null) {
                          return;
                        }
                        setState(() {
                          _selectedExecutionMode = value;
                        });
                      },
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _pickDate,
                            child: Text(formatTaskDate(_selectedDateTime)),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _pickTime,
                            child: Text(formatTaskTime(_selectedDateTime)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    OutlinedButton.icon(
                      onPressed: _openVoiceFlow,
                      icon: const Icon(Icons.mic_none),
                      label: const Text('Speak'),
                    ),
                  ],
                ),
              ),
            ),
            if (_formError != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                _formError!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            AnimatedBuilder(
              animation: widget.taskProvider,
              builder: (context, _) {
                return AppButton(
                  label: widget.taskProvider.isCreating
                      ? 'Posting...'
                      : 'Post task',
                  onPressed: widget.taskProvider.isCreating ? null : _submit,
                );
              },
            ),
          ],
        ),
      ),
    );

    if (!widget.showAppBar) {
      return content;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Post task'),
      ),
      body: content,
    );
  }
}
