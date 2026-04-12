import 'dart:async';

import 'package:frontend/models/voice_capture_result_model.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';

class VoiceService {
  VoiceService({SpeechToText? speechToText})
      : _speechToText = speechToText ?? SpeechToText();

  final SpeechToText _speechToText;
  String _transcript = '';
  double _confidence = 0;
  bool _isListening = false;
  bool _hadError = false;

  Future<void> startListening({
    void Function(String transcript, double confidence)? onTranscript,
  }) async {
    _transcript = '';
    _confidence = 0;
    _hadError = false;

    final available = await _speechToText.initialize(
      onError: (SpeechRecognitionError error) {
        _hadError = true;
      },
    );
    if (!available) {
      throw Exception('Speech recognition unavailable');
    }

    final systemLocale = await _speechToText.systemLocale();
    _isListening = true;

    _speechToText.listen(
      onResult: (SpeechRecognitionResult result) {
        _transcript = result.recognizedWords;
        _confidence =
            result.hasConfidenceRating ? result.confidence : _confidence;
        onTranscript?.call(_transcript, _confidence);
      },
      onSoundLevelChange: (_) {},
      listenFor: const Duration(minutes: 2),
      pauseFor: const Duration(seconds: 10),
      partialResults: true,
      cancelOnError: true,
      onDevice: false,
      localeId: systemLocale?.localeId,
      listenMode: ListenMode.dictation,
    );
  }

  Future<VoiceCaptureResultModel> stopListening() async {
    if (!_isListening) {
      return const VoiceCaptureResultModel(
        status: VoiceCaptureStatus.noSpeech,
        transcript: '',
        confidence: 0,
      );
    }

    await _speechToText.stop();
    _isListening = false;
    await Future<void>.delayed(const Duration(milliseconds: 200));

    final cleaned = _transcript.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (cleaned.isEmpty || _hadError) {
      return const VoiceCaptureResultModel(
        status: VoiceCaptureStatus.noSpeech,
        transcript: '',
        confidence: 0,
      );
    }

    final wordCount =
        cleaned.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
    final status = _confidence < 0.45
        ? VoiceCaptureStatus.lowConfidence
        : wordCount < 5
            ? VoiceCaptureStatus.partial
            : VoiceCaptureStatus.success;

    return VoiceCaptureResultModel(
      status: status,
      transcript: cleaned,
      confidence: _confidence,
    );
  }
}
