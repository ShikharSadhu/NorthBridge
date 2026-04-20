import 'package:flutter_test/flutter_test.dart';

import 'package:frontend/main.dart';

void main() {
  testWidgets('NorthBridge app builds', (WidgetTester tester) async {
    await tester.pumpWidget(const NorthBridgeApp());
    await tester.pumpAndSettle(const Duration(seconds: 1));

    expect(find.byType(NorthBridgeApp), findsOneWidget);
  });
}
