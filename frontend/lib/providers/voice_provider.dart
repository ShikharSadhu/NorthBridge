import 'package:flutter/foundation.dart';
import 'package:frontend/core/state/view_state.dart';
import 'package:frontend/models/voice_capture_result_model.dart';
import 'package:frontend/models/voice_task_draft_model.dart';
import 'package:frontend/services/task_service.dart';
import 'package:frontend/services/voice_service.dart';

class VoiceProvider extends ChangeNotifier {
  VoiceProvider({VoiceService? voiceService, TaskService? taskService})
      : _voiceService = voiceService ?? VoiceService(),
        _taskService = taskService ?? TaskService(),
        _state = ViewState<VoiceCaptureResultModel>.empty(
          message: 'Tap Speak to start voice capture.',
        );

  final VoiceService _voiceService;
  final TaskService _taskService;

  ViewState<VoiceCaptureResultModel> _state;
  bool _isProcessing = false;
  bool _isListening = false;
  String _liveTranscript = '';
  double _liveConfidence = 0;

  ViewState<VoiceCaptureResultModel> get state => _state;
  bool get isProcessing => _isProcessing;
  bool get isListening => _isListening;
  String get liveTranscript => _liveTranscript;
  double get liveConfidence => _liveConfidence;

  bool get hasUsableTranscript =>
      (_state.data?.transcript.trim().isNotEmpty ?? false);

  Future<void> startListening() async {
    if (_isListening) {
      return;
    }

    _liveTranscript = '';
    _liveConfidence = 0;
    _isListening = true;
    _state =
        ViewState<VoiceCaptureResultModel>.loading(previousData: _state.data);
    notifyListeners();

    try {
      await _voiceService.startListening(
        onTranscript: (transcript, confidence) {
          _liveTranscript = transcript;
          _liveConfidence = confidence;
          notifyListeners();
        },
      );
    } catch (_) {
      _isListening = false;
      _state = ViewState<VoiceCaptureResultModel>.error(
        'Unable to process voice right now. Please retry.',
      );
      notifyListeners();
    }
  }

  Future<void> stopListening() async {
    if (!_isListening) {
      return;
    }

    try {
      final result = await _voiceService.stopListening();
      _isListening = false;
      _liveTranscript = result.transcript;
      _liveConfidence = result.confidence;
      _state = ViewState<VoiceCaptureResultModel>.success(result);
    } catch (_) {
      _isListening = false;
      _state = ViewState<VoiceCaptureResultModel>.error(
        'Unable to process voice right now. Please retry.',
      );
    }

    notifyListeners();
  }

  Future<void> retry() async {
    _state = ViewState<VoiceCaptureResultModel>.empty(
      message: 'Hold Speak and talk. Release to stop.',
    );
    _liveTranscript = '';
    _liveConfidence = 0;
    _isListening = false;
    notifyListeners();
  }

  Future<VoiceTaskDraftModel?> processCurrentTranscript() async {
    final transcript = _state.data?.transcript.trim() ?? '';
    if (transcript.isEmpty) {
      return null;
    }

    _isProcessing = true;
    notifyListeners();

    try {
      final structuredJson = await _taskService.processVoiceInput(transcript);
      return VoiceTaskDraftModel.fromJson(structuredJson);
    } catch (_) {
      return null;
    } finally {
      _isProcessing = false;
      notifyListeners();
    }
  }
}
