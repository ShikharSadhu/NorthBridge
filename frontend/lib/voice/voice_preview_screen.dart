import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/core/utils/date_time_utils.dart';
import 'package:frontend/models/voice_task_draft_model.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_text_field.dart';

class VoicePreviewScreen extends StatefulWidget {
  const VoicePreviewScreen({
    super.key,
    required this.initialDraft,
  });

  static const String routeName = '/voice/preview';

  final VoiceTaskDraftModel initialDraft;

  @override
  State<VoicePreviewScreen> createState() => _VoicePreviewScreenState();
}

class _VoicePreviewScreenState extends State<VoicePreviewScreen> {
  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _locationController;
  late final TextEditingController _priceController;
  late DateTime _scheduledAt;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.initialDraft.title);
    _descriptionController = TextEditingController(
      text: widget.initialDraft.description,
    );
    _locationController =
        TextEditingController(text: widget.initialDraft.location);
    _priceController = TextEditingController(
      text: widget.initialDraft.price == 0
          ? ''
          : widget.initialDraft.price.toString(),
    );
    _scheduledAt = widget.initialDraft.scheduledAt;
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
      initialDate: _scheduledAt,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _scheduledAt = DateTime(
        picked.year,
        picked.month,
        picked.day,
        _scheduledAt.hour,
        _scheduledAt.minute,
      );
    });
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _scheduledAt = DateTime(
        _scheduledAt.year,
        _scheduledAt.month,
        _scheduledAt.day,
        picked.hour,
        picked.minute,
      );
    });
  }

  void _confirm() {
    final price = double.tryParse(_priceController.text.trim()) ?? 0;

    final draft = VoiceTaskDraftModel(
      title: _titleController.text.trim(),
      description: _descriptionController.text.trim(),
      location: _locationController.text.trim(),
      price: price,
      scheduledAt: _scheduledAt,
    );

    Navigator.of(context).pop(draft);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice preview'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: ListView(
            padding: AppSpacing.screenPadding,
            children: [
              Text('Review before applying', style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Edit anything that looks incorrect.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              AppTextField(
                label: 'Title',
                controller: _titleController,
              ),
              const SizedBox(height: AppSpacing.sm),
              AppTextField(
                label: 'Description',
                controller: _descriptionController,
                maxLines: 4,
              ),
              const SizedBox(height: AppSpacing.sm),
              AppTextField(
                label: 'Location',
                controller: _locationController,
              ),
              const SizedBox(height: AppSpacing.sm),
              AppTextField(
                label: 'Price',
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
                      child: Text(formatTaskDate(_scheduledAt)),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _pickTime,
                      child: Text(formatTaskTime(_scheduledAt)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(
                label: 'Use this draft',
                onPressed: _confirm,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
