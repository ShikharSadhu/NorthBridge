enum VoiceCaptureStatus {
  success,
  noSpeech,
  partial,
  lowConfidence,
}

class VoiceCaptureResultModel {
  const VoiceCaptureResultModel({
    required this.status,
    required this.transcript,
    required this.confidence,
  });

  final VoiceCaptureStatus status;
  final String transcript;
  final double confidence;

  bool get hasTranscript => transcript.trim().isNotEmpty;
}
