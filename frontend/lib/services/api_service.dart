import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

enum ApiHttpMethod {
	get,
	post,
	put,
	patch,
	delete,
}

class ApiException implements Exception {
	ApiException({
		required this.message,
		this.statusCode,
		this.uri,
		this.details,
	});

	final String message;
	final int? statusCode;
	final Uri? uri;
	final Object? details;

	@override
	String toString() {
		final codeText = statusCode == null ? '' : ' ($statusCode)';
		return 'ApiException$codeText: $message';
	}
}

class ApiTelemetryEvent {
	ApiTelemetryEvent({
		required this.method,
		required this.path,
		required this.durationMs,
		required this.success,
		this.statusCode,
		this.requestId,
		this.errorMessage,
	});

	final ApiHttpMethod method;
	final String path;
	final int durationMs;
	final bool success;
	final int? statusCode;
	final String? requestId;
	final String? errorMessage;
}

typedef ApiTelemetryHandler = void Function(ApiTelemetryEvent event);

class ApiService {
	ApiService({
		String? baseUrl,
		http.Client? client,
		Duration? timeout,
		Map<String, String>? defaultHeaders,
	})  : _baseUrl = _sanitizeBaseUrl(baseUrl ?? _defaultBaseUrl),
				_client = client ?? http.Client(),
				_timeout = timeout ?? const Duration(seconds: 12),
				_defaultHeaders = {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					...?defaultHeaders,
				};

	static const String _defaultBaseUrl = String.fromEnvironment(
		'NB_API_BASE_URL',
		defaultValue: '',
	);

	final String _baseUrl;
	final http.Client _client;
	final Duration _timeout;
	final Map<String, String> _defaultHeaders;

	static String? _globalBearerToken;
	static Map<String, String> _globalAuthOverrideHeaders = const {};
	static ApiTelemetryHandler? _telemetryHandler;

	static void setGlobalBearerToken(String? token) {
		final normalized = token?.trim();
		_globalBearerToken =
				(normalized == null || normalized.isEmpty) ? null : normalized;
	}

	static void setGlobalAuthOverrideHeaders(Map<String, String>? headers) {
		_globalAuthOverrideHeaders = headers == null
				? const {}
				: Map<String, String>.fromEntries(
						headers.entries.where((entry) => entry.value.trim().isNotEmpty),
					);
	}

	static void setTelemetryHandler(ApiTelemetryHandler? handler) {
		_telemetryHandler = handler;
	}

	Future<Map<String, dynamic>> getJson(
		String path, {
		Map<String, dynamic>? queryParameters,
		Map<String, String>? headers,
		String? bearerToken,
	}) {
		return _sendJsonRequest(
			method: ApiHttpMethod.get,
			path: path,
			queryParameters: queryParameters,
			headers: headers,
			bearerToken: bearerToken,
		);
	}

	Future<Map<String, dynamic>> postJson(
		String path, {
		Map<String, dynamic>? body,
		Map<String, dynamic>? queryParameters,
		Map<String, String>? headers,
		String? bearerToken,
	}) {
		return _sendJsonRequest(
			method: ApiHttpMethod.post,
			path: path,
			body: body,
			queryParameters: queryParameters,
			headers: headers,
			bearerToken: bearerToken,
		);
	}

	Future<Map<String, dynamic>> patchJson(
		String path, {
		Map<String, dynamic>? body,
		Map<String, dynamic>? queryParameters,
		Map<String, String>? headers,
		String? bearerToken,
	}) {
		return _sendJsonRequest(
			method: ApiHttpMethod.patch,
			path: path,
			body: body,
			queryParameters: queryParameters,
			headers: headers,
			bearerToken: bearerToken,
		);
	}

	Future<Map<String, dynamic>> _sendJsonRequest({
		required ApiHttpMethod method,
		required String path,
		Map<String, dynamic>? body,
		Map<String, dynamic>? queryParameters,
		Map<String, String>? headers,
		String? bearerToken,
	}) async {
		final startedAt = DateTime.now();
		final uri = _buildUri(path, queryParameters);
		final resolvedHeaders = {
			..._defaultHeaders,
			..._globalAuthOverrideHeaders,
			...?headers,
		};
		final resolvedBearerToken =
				(bearerToken != null && bearerToken.trim().isNotEmpty)
						? bearerToken.trim()
						: _globalBearerToken;
		if (resolvedBearerToken != null && resolvedBearerToken.isNotEmpty) {
			resolvedHeaders['Authorization'] = 'Bearer $resolvedBearerToken';
		}

		final encodedBody = body == null ? null : jsonEncode(body);

		http.Response response;
		ApiException? capturedException;
		try {
			response = await _dispatch(
				method: method,
				uri: uri,
				headers: resolvedHeaders,
				encodedBody: encodedBody,
			).timeout(_timeout);
		} on http.ClientException catch (error) {
			capturedException = ApiException(
				message: 'Unable to connect to API server.',
				uri: uri,
				details: error,
			);
			throw capturedException;
		} on TimeoutException catch (error) {
			capturedException = ApiException(
				message: 'API request timed out.',
				uri: uri,
				details: error,
			);
			throw capturedException;
		} catch (error) {
			capturedException = ApiException(
				message: 'Unexpected API request error.',
				uri: uri,
				details: error,
			);
			throw capturedException;
		} finally {
			if (capturedException != null) {
				_emitTelemetry(
					ApiTelemetryEvent(
						method: method,
						path: path,
						durationMs: DateTime.now().difference(startedAt).inMilliseconds,
						success: false,
						statusCode: capturedException.statusCode,
						errorMessage: capturedException.message,
					),
				);
			}
		}

		final dynamic decoded = _decodeResponseBody(response.body);
		final responseMap = decoded is Map<String, dynamic>
				? decoded
				: <String, dynamic>{'data': decoded};

		if (response.statusCode < 200 || response.statusCode >= 300) {
			final message = _extractErrorMessage(responseMap);
			final apiError = ApiException(
				message: message,
				statusCode: response.statusCode,
				uri: uri,
				details: responseMap,
			);
			_emitTelemetry(
				ApiTelemetryEvent(
					method: method,
					path: path,
					durationMs: DateTime.now().difference(startedAt).inMilliseconds,
					success: false,
					statusCode: response.statusCode,
					requestId: response.headers['x-request-id'],
					errorMessage: message,
				),
			);
			throw apiError;
		}

		_emitTelemetry(
			ApiTelemetryEvent(
				method: method,
				path: path,
				durationMs: DateTime.now().difference(startedAt).inMilliseconds,
				success: true,
				statusCode: response.statusCode,
				requestId: response.headers['x-request-id'],
			),
		);

		return responseMap;
	}

	void _emitTelemetry(ApiTelemetryEvent event) {
		final handler = _telemetryHandler;
		if (handler == null) {
			return;
		}

		handler(event);
	}

	Future<http.Response> _dispatch({
		required ApiHttpMethod method,
		required Uri uri,
		required Map<String, String> headers,
		String? encodedBody,
	}) {
		switch (method) {
			case ApiHttpMethod.get:
				return _client.get(uri, headers: headers);
			case ApiHttpMethod.post:
				return _client.post(uri, headers: headers, body: encodedBody);
			case ApiHttpMethod.put:
				return _client.put(uri, headers: headers, body: encodedBody);
			case ApiHttpMethod.patch:
				return _client.patch(uri, headers: headers, body: encodedBody);
			case ApiHttpMethod.delete:
				return _client.delete(uri, headers: headers, body: encodedBody);
		}
	}

	Uri _buildUri(String path, Map<String, dynamic>? queryParameters) {
		final normalizedPath = path.startsWith('/') ? path : '/$path';
		final query = <String, String>{};

		queryParameters?.forEach((key, value) {
			if (value == null) {
				return;
			}

			final asString = value.toString().trim();
			if (asString.isEmpty) {
				return;
			}

			query[key] = asString;
		});

		return Uri.parse('$_baseUrl$normalizedPath').replace(
			queryParameters: query.isEmpty ? null : query,
		);
	}

	dynamic _decodeResponseBody(String body) {
		final trimmed = body.trim();
		if (trimmed.isEmpty) {
			return <String, dynamic>{};
		}

		try {
			return jsonDecode(trimmed);
		} catch (_) {
			return <String, dynamic>{'message': trimmed};
		}
	}

	String _extractErrorMessage(Map<String, dynamic> responseBody) {
		final message = responseBody['message'];
		if (message is String && message.trim().isNotEmpty) {
			return message.trim();
		}

		return 'API request failed.';
	}

	static String _sanitizeBaseUrl(String baseUrl) {
		if (baseUrl.trim().isEmpty) {
			if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
				return 'http://10.0.2.2:3000';
			}

			return 'http://localhost:3000';
		}

		return baseUrl.endsWith('/')
				? baseUrl.substring(0, baseUrl.length - 1)
				: baseUrl;
	}
}
