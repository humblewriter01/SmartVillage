import 'package:flutter/material.dart';

void main() {
  runApp(const SmartVillageApp());
}

class SmartVillageApp extends StatelessWidget {
  const SmartVillageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartVillage',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1F7A4C)),
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text('SmartVillage Offline-First Web Application'),
        ),
      ),
    );
  }
}
