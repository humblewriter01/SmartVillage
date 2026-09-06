import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:tflite_flutter/tflite_flutter.dart';

class Prediction {
  final String label;
  final double confidence;
  const Prediction(this.label, this.confidence);
}

class CropResult {
  final List<Prediction> predictions;
  final String advice;
  const CropResult(this.predictions, this.advice);
}

class HealthResult {
  final String condition;
  final String advice;
  final String urgency;
  final double confidence;
  const HealthResult(
      this.condition, this.advice, this.urgency, this.confidence);
}

class CropModelService {
  Interpreter? _interpreter;
  List<String> _labels = const [];

  Future<void> _load() async {
    if (_interpreter != null) return;
    final options = InterpreterOptions()..threads = 2;
    _interpreter = await Interpreter.fromAsset(
        'assets/models/crop/kisandoc.tflite',
        options: options);
    _labels = (await rootBundle.loadString('assets/models/crop/labels.txt'))
        .split('\n')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
  }

  Future<CropResult> analyze(File file) async {
    try {
      await _load();
      final bytes = await file.readAsBytes();
      final source = img.decodeImage(bytes);
      if (source == null)
        throw const FormatException('Image could not be decoded');
      final resized = img.copyResize(source, width: 224, height: 224);
      final input = List.generate(
          1,
          (_) => List.generate(
              224,
              (y) => List.generate(224, (x) {
                    final p = resized.getPixel(x, y);
                    return [p.r / 255.0, p.g / 255.0, p.b / 255.0];
                  })));
      final output = [List<double>.filled(max(_labels.length, 15), 0)];
      _interpreter!.run(input, output);
      final values = output.first;
      final ranked = List.generate(min(values.length, _labels.length),
          (i) => Prediction(_labels[i], values[i]))
        ..sort((a, b) => b.confidence.compareTo(a.confidence));
      final top = ranked.take(3).toList();
      return CropResult(top, _cropAdvice(top.first.label));
    } catch (_) {
      return const CropResult([
        Prediction('Needs closer inspection', 0.0)
      ], 'Take a clear photo of one leaf in daylight. Separate affected plants, avoid unnecessary spraying, and ask a local extension worker for confirmation.');
    }
  }

  String _cropAdvice(String label) {
    final l = label.toLowerCase();
    if (l.contains('healthy'))
      return 'The leaf looks healthy. Continue field monitoring, balanced nutrition, and good spacing.';
    if (l.contains('blight') || l.contains('spot'))
      return 'Remove badly affected leaves, avoid wetting foliage, improve airflow, and use only locally approved treatment after confirmation.';
    if (l.contains('rust') || l.contains('mildew'))
      return 'Isolate affected plants, reduce leaf wetness, remove infected material, and consult an extension worker before applying a fungicide.';
    return 'Treat this as an early warning. Compare symptoms with the offline knowledge base and seek local agricultural advice before spraying.';
  }

  void dispose() => _interpreter?.close();
}

class HealthModelService {
  Interpreter? _interpreter;

  Future<void> _load() async {
    _interpreter ??= await Interpreter.fromAsset(
        'assets/models/health/health_model.tflite',
        options: InterpreterOptions()..threads = 2);
  }

  Future<HealthResult> analyze(File file) async {
    try {
      await _load();
      // The source health model does not ship a reliable public label map.
      // Keep its adapter isolated and provide safe symptom guidance until labels are verified.
      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) throw const FormatException('Empty image');
    } catch (_) {}
    return const HealthResult(
        'Health concern needs assessment',
        'Rest, drink safe fluids, and record when the symptoms started. Do not self-medicate based only on a photo. A trained health worker should review persistent or worsening symptoms.',
        'Seek care if symptoms are severe, sudden, or worsening.',
        0.0);
  }

  void dispose() => _interpreter?.close();
}

class VoiceService {
  final stt.SpeechToText speech = stt.SpeechToText();
  final FlutterTts tts = FlutterTts();

  Future<bool> startListening(
      {required String localeId, required void Function(String) onText}) async {
    final ready = await speech.initialize();
    if (!ready) return false;
    await speech.listen(
        localeId: localeId, onResult: (r) => onText(r.recognizedWords));
    return true;
  }

  Future<void> stopListening() => speech.stop();

  Future<void> speak(String text, String language) async {
    await tts.setLanguage(language == 'ha' ? 'ha-NG' : 'en-NG');
    await tts.setSpeechRate(0.46);
    await tts.speak(text);
  }
}

class WeatherDay {
  final DateTime date;
  final double max;
  final double min;
  final double rain;
  const WeatherDay(this.date, this.max, this.min, this.rain);
}

class WeatherService {
  static const _cacheKey = 'smartvillage.weather.cache';
  Future<List<WeatherDay>> load(
      {double lat = 9.0579, double lon = 7.4951}) async {
    try {
      final uri = Uri.parse(
          'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa%2FLagos');
      final response = await http.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final days = _parse(data);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
            _cacheKey,
            jsonEncode(days
                .map((d) => {
                      'date': d.date.toIso8601String(),
                      'max': d.max,
                      'min': d.min,
                      'rain': d.rain
                    })
                .toList()));
        return days;
      }
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_cacheKey);
    if (cached == null) return const [];
    return (jsonDecode(cached) as List)
        .map((e) => WeatherDay(
            DateTime.parse(e['date']),
            (e['max'] as num).toDouble(),
            (e['min'] as num).toDouble(),
            (e['rain'] as num).toDouble()))
        .toList();
  }

  List<WeatherDay> _parse(Map<String, dynamic> data) {
    final daily = data['daily'] as Map<String, dynamic>;
    final dates = (daily['time'] as List).cast<String>();
    final max = (daily['temperature_2m_max'] as List).cast<num>();
    final min = (daily['temperature_2m_min'] as List).cast<num>();
    final rain = (daily['precipitation_sum'] as List).cast<num>();
    return List.generate(
        dates.length,
        (i) => WeatherDay(DateTime.parse(dates[i]), max[i].toDouble(),
            min[i].toDouble(), rain[i].toDouble()));
  }
}

class KnowledgeEntry {
  final String title;
  final String body;
  final bool health;
  const KnowledgeEntry(this.title, this.body, this.health);
}

class KnowledgeService {
  Future<List<KnowledgeEntry>> load() async {
    final entries = <KnowledgeEntry>[];
    final raw = await rootBundle.loadString('assets/knowledge/crop_kb.jsonl');
    for (final line in raw.split('\n')) {
      if (line.trim().isEmpty) continue;
      try {
        final item = jsonDecode(line) as Map<String, dynamic>;
        entries.add(KnowledgeEntry(
            item['title']?.toString() ??
                item['disease']?.toString() ??
                'Crop guidance',
            item['content']?.toString() ?? item['advice']?.toString() ?? line,
            false));
      } catch (_) {}
    }
    try {
      final catalog = jsonDecode(await rootBundle
              .loadString('assets/knowledge/verified_nigeria_catalog.json'))
          as Map<String, dynamic>;
      for (final item in (catalog['crops'] as List)) {
        entries.add(KnowledgeEntry(item['name'].toString(),
            '${item['guidance']}\\n\\nSource: ${item['source']}', false));
      }
      for (final item in (catalog['healthTopics'] as List)) {
        entries.add(KnowledgeEntry(item['name'].toString(),
            '${item['guidance']}\\n\\nSource: ${item['source']}', true));
      }
    } catch (_) {}
    try {
      final rural = jsonDecode(await rootBundle.loadString(
          'assets/knowledge/rural_guidance.json')) as Map<String, dynamic>;
      for (final item in (rural['entries'] as List)) {
        entries.add(KnowledgeEntry(item['title'].toString(),
            item['body'].toString(), item['health'] == true));
      }
    } catch (_) {}
    entries.addAll(const [
      KnowledgeEntry(
          'Fever and danger signs',
          'Seek urgent care for difficulty breathing, confusion, convulsions, severe weakness, persistent vomiting, or a child who is unusually sleepy.',
          true),
      KnowledgeEntry(
          'Possible malaria symptoms',
          'Fever, chills, headache, body aches, and weakness can have many causes. Use a trusted test and contact a health worker rather than relying on symptoms alone.',
          true),
      KnowledgeEntry(
          'Skin changes',
          'Keep the area clean and dry. Avoid sharing creams or using strong medicines without advice. Seek care for spreading redness, pus, severe pain, or fever.',
          true),
      KnowledgeEntry(
          'Safe crop observation',
          'Photograph one leaf in good daylight with the camera focused. Check several plants and compare the result with field symptoms before taking action.',
          false),
    ]);
    return entries;
  }
}
