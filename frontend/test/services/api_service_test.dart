import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/services/api_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
	group('ApiService telemetry', () {
		tearDown(() {
			ApiService.setTelemetryHandler(null);
		});

		test('emits success telemetry with status and request id', () async {
			ApiTelemetryEvent? captured;
			ApiService.setTelemetryHandler((event) {
				captured = event;
			});

			final api = ApiService(
				baseUrl: 'http://localhost:3000',
				client: MockClient((request) async {
					expect(request.method, 'GET');
					expect(request.url.path, '/v1/health');
					return http.Response(
						'{"status":"ok"}',
						200,
						headers: {'x-request-id': 'req-42'},
					);
				}),
			);

			final result = await api.getJson('/v1/health');
			expect(result['status'], 'ok');

			expect(captured, isNotNull);
			expect(captured!.success, isTrue);
			expect(captured!.statusCode, 200);
			expect(captured!.requestId, 'req-42');
			expect(captured!.path, '/v1/health');
			expect(captured!.durationMs, greaterThanOrEqualTo(0));
		});

		test('emits failure telemetry for non-2xx responses', () async {
			ApiTelemetryEvent? captured;
			ApiService.setTelemetryHandler((event) {
				captured = event;
			});

			final api = ApiService(
				baseUrl: 'http://localhost:3000',
				client: MockClient((request) async {
					expect(request.method, 'POST');
					return http.Response(
						'{"message":"Validation failed."}',
						400,
						headers: {'x-request-id': 'req-400'},
					);
				}),
			);

			await expectLater(
				api.postJson('/v1/voice', body: <String, dynamic>{}),
				throwsA(isA<ApiException>()),
			);

			expect(captured, isNotNull);
			expect(captured!.success, isFalse);
			expect(captured!.statusCode, 400);
			expect(captured!.requestId, 'req-400');
			expect(captured!.errorMessage, 'Validation failed.');
			expect(captured!.path, '/v1/voice');
		});
	});
}
