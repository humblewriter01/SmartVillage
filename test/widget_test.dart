import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:smart_village/main.dart';

void main() {
  testWidgets('SmartVillage launches with both core actions', (tester) async {
    await tester.pumpWidget(ChangeNotifierProvider(
        create: (_) => AppState(), child: const SmartVillageApp()));
    await tester.pumpAndSettle(const Duration(seconds: 2));

    expect(find.text('SmartVillage'), findsOneWidget);
    expect(find.text('Check crop'), findsOneWidget);
    expect(find.text('Check health'), findsOneWidget);
  });
}
