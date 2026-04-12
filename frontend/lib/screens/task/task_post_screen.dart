import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/providers/task_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_text_field.dart';

class TaskPostScreen extends StatefulWidget {
  const TaskPostScreen({
    super.key,
    required this.taskProvider,
    this.showAppBar = true,
    this.closeOnSuccess = true,
    this.onTaskCreated,
  });

  static const String routeName = '/task/post';

  final TaskProvider taskProvider;
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

    final created = await widget.taskProvider.createTask(
      title: title,
      description: description,
      location: location,
      price: price,
      scheduledAt: _selectedDateTime,
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
        widget.onTaskCreated?.call();
      }
    } else {
      setState(() {
        _formError = 'Unable to create task. Please try again.';
      });
    }
  }

  Future<void> _openVoiceFlow() async {
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
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Add clear details so others can help quickly.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
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
              hintText: 'e.g. 25',
              controller: _priceController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
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
