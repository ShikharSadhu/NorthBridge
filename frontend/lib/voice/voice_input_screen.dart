import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/models/voice_instruction_item_model.dart';
import 'package:frontend/models/voice_capture_result_model.dart';
import 'package:frontend/providers/voice_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';

class VoiceInputScreen extends StatelessWidget {
  const VoiceInputScreen({
    super.key,
    required this.voiceProvider,
  });

  static const String routeName = '/voice/input';

  final VoiceProvider voiceProvider;

  List<VoiceInstructionItemModel> get _instructionItems {
    return const [
      VoiceInstructionItemModel(
        english: 'Task: grocery pickup from Sector 21 market',
        hindi: 'काम: सेक्टर 21 मार्केट से ग्रोसरी लानी है',
      ),
      VoiceInstructionItemModel(
        english: 'Time: today 7 PM',
        hindi: 'समय: आज शाम 7 बजे',
      ),
      VoiceInstructionItemModel(
        english: 'Budget: 250 rupees',
        hindi: 'बजट: 250 रुपये',
      ),
      VoiceInstructionItemModel(
        english: 'Mode: offline',
        hindi: 'मोड: ऑफलाइन',
      ),
    ];
  }

  String _statusMessage(VoiceCaptureResultModel? result) {
    if (result == null) {
      return 'Hold Speak and talk. Release to stop.';
    }

    switch (result.status) {
      case VoiceCaptureStatus.noSpeech:
        return 'No speech detected. Please retry.';
      case VoiceCaptureStatus.partial:
        return 'Input looks partial. Retry or continue and edit in preview.';
      case VoiceCaptureStatus.lowConfidence:
        return 'Low confidence recognition. Retry for better results.';
      case VoiceCaptureStatus.success:
        return 'Voice captured successfully.';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Voice input'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: AnimatedBuilder(
              animation: voiceProvider,
              builder: (context, _) {
                final result = voiceProvider.state.data;
                final isLoading = voiceProvider.state.isLoading;
                final isProcessing = voiceProvider.isProcessing;
                final isListening = voiceProvider.isListening;
                final liveTranscript = voiceProvider.liveTranscript.trim();
                final resultTranscript =
                    ((result?.transcript as Object?)?.toString() ?? '').trim();
                final displayedTranscript = (isLoading || isListening)
                    ? (liveTranscript.isNotEmpty
                        ? liveTranscript
                        : (resultTranscript.isNotEmpty
                            ? resultTranscript
                            : 'Listening...'))
                    : (resultTranscript.isNotEmpty
                        ? resultTranscript
                        : 'No transcript yet');
                final displayedConfidence = isLoading
                    ? voiceProvider.liveConfidence
                    : (result?.confidence ?? 0);

                return SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Speak your task',
                        style: theme.textTheme.titleLarge,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Say title, location, time, and budget in one sentence.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      AppCard(
                        child: Padding(
                          padding: AppSpacing.cardPadding,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'What to mention (English + Hindi)',
                                style: theme.textTheme.titleMedium,
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              ..._instructionItems.map(
                                (item) => Padding(
                                  padding: const EdgeInsets.only(
                                      bottom: AppSpacing.xs),
                                  child: Text(
                                    '• ${item.english}\n• ${item.hindi}',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Container(
                        width: double.infinity,
                        padding: AppSpacing.cardPadding,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          displayedTranscript,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        _statusMessage(result),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color:
                              (result?.status == VoiceCaptureStatus.noSpeech ||
                                      result?.status ==
                                          VoiceCaptureStatus.lowConfidence)
                                  ? theme.colorScheme.error
                                  : theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      if ((isLoading && liveTranscript.isNotEmpty) ||
                          (result != null && result.hasTranscript)) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Confidence: ${(displayedConfidence * 100).toStringAsFixed(0)}%',
                          style: theme.textTheme.labelMedium,
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      AppButton(
                        label:
                            isListening ? 'Release to stop' : 'Hold to speak',
                        onPressed: null,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      SizedBox(
                        width: double.infinity,
                        child: Listener(
                          onPointerDown: (_) {
                            if (!isProcessing) {
                              voiceProvider.startListening();
                            }
                          },
                          onPointerUp: (_) {
                            voiceProvider.stopListening();
                          },
                          onPointerCancel: (_) {
                            voiceProvider.stopListening();
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: isListening
                                  ? theme.colorScheme.primaryContainer
                                  : theme.colorScheme.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              isListening
                                  ? 'Listening... release now'
                                  : 'Press and hold Speak',
                              style: theme.textTheme.labelLarge?.copyWith(
                                color: isListening
                                    ? theme.colorScheme.onPrimaryContainer
                                    : theme.colorScheme.onPrimary,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed:
                                  (isLoading || isProcessing || isListening)
                                      ? null
                                      : voiceProvider.retry,
                              child: const Text('Retry'),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.xs),
                          Expanded(
                            child: FilledButton(
                              onPressed: isLoading ||
                                      isProcessing ||
                                      isListening ||
                                      !voiceProvider.hasUsableTranscript
                                  ? null
                                  : () async {
                                      final draft = await voiceProvider
                                          .processCurrentTranscript();
                                      if (draft == null) {
                                        return;
                                      }

                                      final reviewed =
                                          await AppRoutes.goToVoicePreview(
                                        context,
                                        draft: draft,
                                      );

                                      if (!context.mounted) {
                                        return;
                                      }

                                      if (reviewed != null) {
                                        Navigator.of(context).pop(reviewed);
                                      }
                                    },
                              child: Text(
                                isProcessing ? 'Processing...' : 'Continue',
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
