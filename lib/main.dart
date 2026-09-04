import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import 'services/app_services.dart';
import 'utils/translations.dart';

void main() => runApp(ChangeNotifierProvider(
    create: (_) => AppState(), child: const SmartVillageApp()));

class AppState extends ChangeNotifier {
  Locale locale = const Locale('en');
  int tab = 0;
  final crop = CropModelService();
  final health = HealthModelService();
  final voice = VoiceService();
  final weather = WeatherService();
  final knowledge = KnowledgeService();
  List<WeatherDay> forecast = const [];
  List<KnowledgeEntry> entries = const [];
  bool weatherLoading = false;
  bool knowledgeLoading = false;
  bool listening = false;

  String get voiceLocale => locale.languageCode == 'ha' ? 'ha-NG' : 'en_NG';
  void setLanguage(String code) {
    locale = Locale(code);
    notifyListeners();
  }

  void setTab(int value) {
    tab = value;
    notifyListeners();
  }

  Future<void> loadWeather() async {
    weatherLoading = true;
    notifyListeners();
    forecast = await weather.load();
    weatherLoading = false;
    notifyListeners();
  }

  Future<void> loadKnowledge() async {
    knowledgeLoading = true;
    notifyListeners();
    entries = await knowledge.load();
    knowledgeLoading = false;
    notifyListeners();
  }

  Future<void> toggleListening(void Function(String) onText) async {
    if (listening) {
      await voice.stopListening();
      listening = false;
      notifyListeners();
      return;
    }
    listening =
        await voice.startListening(localeId: voiceLocale, onText: onText);
    notifyListeners();
  }
}

class SmartVillageApp extends StatelessWidget {
  const SmartVillageApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'SmartVillage',
        locale: context.watch<AppState>().locale,
        supportedLocales: const [Locale('en'), Locale('ha')],
        theme: ThemeData(
            useMaterial3: true,
            scaffoldBackgroundColor: const Color(0xfff6faf7),
            colorScheme:
                ColorScheme.fromSeed(seedColor: const Color(0xff1f7a4c)),
            fontFamily: 'sans'),
        home: const Shell(),
      );
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final s = context.read<AppState>();
      s.loadWeather();
      s.loadKnowledge();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final pages = [
      const HomeScreen(),
      const CropScreen(),
      const HealthScreen(),
      const WeatherScreen(),
      const KnowledgeScreen()
    ];
    final labels = ['home', 'crop', 'health', 'weather', 'knowledge'];
    final icons = [
      Icons.home_rounded,
      Icons.grass_rounded,
      Icons.health_and_safety_rounded,
      Icons.cloud_rounded,
      Icons.menu_book_rounded
    ];
    return Scaffold(
      appBar: AppBar(title: Text(AppStrings.t(context, 'appName')), actions: [
        Padding(
            padding: const EdgeInsets.only(right: 12),
            child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                    value: state.locale.languageCode,
                    items: [
                      DropdownMenuItem(
                          value: 'en',
                          child: Text(AppStrings.t(context, 'english'))),
                      DropdownMenuItem(
                          value: 'ha',
                          child: Text(AppStrings.t(context, 'hausa')))
                    ],
                    onChanged: (v) {
                      if (v != null) state.setLanguage(v);
                    })))
      ]),
      body: pages[state.tab],
      bottomNavigationBar: NavigationBar(
          selectedIndex: state.tab,
          onDestinationSelected: state.setTab,
          destinations: List.generate(
              labels.length,
              (i) => NavigationDestination(
                  icon: Icon(icons[i]),
                  label: AppStrings.t(context, labels[i])))),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final s = context.read<AppState>();
    return ListView(padding: const EdgeInsets.all(20), children: [
      Text(AppStrings.t(context, 'tagline'),
          style: Theme.of(context)
              .textTheme
              .headlineSmall
              ?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 20),
      _ActionCard(
          color: const Color(0xff1f7a4c),
          icon: Icons.grass_rounded,
          title: AppStrings.t(context, 'checkCrop'),
          subtitle: AppStrings.t(context, 'cropSubtitle'),
          onTap: () => s.setTab(1)),
      const SizedBox(height: 14),
      _ActionCard(
          color: const Color(0xffc44747),
          icon: Icons.health_and_safety_rounded,
          title: AppStrings.t(context, 'checkHealth'),
          subtitle: AppStrings.t(context, 'healthSubtitle'),
          onTap: () => s.setTab(2)),
      const SizedBox(height: 18),
      const WeatherPreview(),
      const SizedBox(height: 18),
      Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: Colors.white, borderRadius: BorderRadius.circular(20)),
          child: Text(AppStrings.t(context, 'notMedical'),
              style: Theme.of(context).textTheme.bodySmall)),
    ]);
  }
}

class _ActionCard extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  const _ActionCard(
      {required this.color,
      required this.icon,
      required this.title,
      required this.subtitle,
      required this.onTap});
  @override
  Widget build(BuildContext context) => Card(
      color: color,
      child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(children: [
                Icon(icon, color: Colors.white, size: 40),
                const SizedBox(width: 16),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(title,
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 20)),
                      const SizedBox(height: 6),
                      Text(subtitle,
                          style: const TextStyle(color: Colors.white70))
                    ])),
                const Icon(Icons.arrow_forward_rounded, color: Colors.white)
              ]))));
}

class WeatherPreview extends StatelessWidget {
  const WeatherPreview({super.key});
  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.green.shade100)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.cloud_rounded, color: Color(0xff1f7a4c)),
            const SizedBox(width: 8),
            Text(AppStrings.t(context, 'weatherTitle'),
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const Spacer(),
            Text(
                state.forecast.isEmpty
                    ? AppStrings.t(context, 'offline')
                    : AppStrings.t(context, 'cached'),
                style: Theme.of(context).textTheme.labelSmall)
          ]),
          const SizedBox(height: 14),
          if (state.forecast.isEmpty)
            Text(AppStrings.t(context, 'noWeather'))
          else
            Text(
                '${state.forecast.first.max.toStringAsFixed(0)}° / ${state.forecast.first.min.toStringAsFixed(0)}°C · ${state.forecast.first.rain.toStringAsFixed(1)} mm')
        ]));
  }
}

class CropScreen extends StatefulWidget {
  const CropScreen({super.key});
  @override
  State<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends State<CropScreen> {
  File? photo;
  CropResult? result;
  bool busy = false;
  Future<void> pick(ImageSource source) async {
    final x = await ImagePicker()
        .pickImage(source: source, maxWidth: 1600, imageQuality: 85);
    if (x != null)
      setState(() {
        photo = File(x.path);
        result = null;
      });
  }

  Future<void> analyze() async {
    if (photo == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppStrings.t(context, 'noPhoto'))));
      return;
    }
    setState(() => busy = true);
    final r = await context.read<AppState>().crop.analyze(photo!);
    if (mounted)
      setState(() {
        result = r;
        busy = false;
      });
  }

  @override
  Widget build(BuildContext context) => _ScanLayout(
      title: AppStrings.t(context, 'crop'),
      subtitle: AppStrings.t(context, 'cropSubtitle'),
      color: const Color(0xff1f7a4c),
      photo: photo,
      onCamera: () => pick(ImageSource.camera),
      onGallery: () => pick(ImageSource.gallery),
      busy: busy,
      onAnalyze: analyze,
      result: result == null
          ? null
          : _ResultCard(
              title: AppStrings.t(context, 'cropResult'),
              headline: result!.predictions.first.label.replaceAll('_', ' '),
              confidence: result!.predictions.first.confidence,
              advice: result!.advice,
              color: const Color(0xff1f7a4c),
              onSpeak: () => context.read<AppState>().voice.speak(
                  '${result!.predictions.first.label}. ${result!.advice}',
                  context.read<AppState>().locale.languageCode)));
}

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});
  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  File? photo;
  HealthResult? result;
  bool busy = false;
  final symptoms = TextEditingController();
  Future<void> pick(ImageSource source) async {
    final x = await ImagePicker()
        .pickImage(source: source, maxWidth: 1600, imageQuality: 85);
    if (x != null)
      setState(() {
        photo = File(x.path);
        result = null;
      });
  }

  Future<void> analyze() async {
    if (photo == null && symptoms.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppStrings.t(context, 'noPhoto'))));
      return;
    }
    setState(() => busy = true);
    final r = photo == null
        ? const HealthResult(
            'Symptoms need a health-worker assessment',
            'Keep a note of symptoms, temperature if available, fluids taken, and any medicines used. Seek a health worker for testing.',
            'Seek care if symptoms worsen.',
            0)
        : await context.read<AppState>().health.analyze(photo!);
    if (mounted)
      setState(() {
        result = r;
        busy = false;
      });
  }

  @override
  Widget build(BuildContext context) => _ScanLayout(
      title: AppStrings.t(context, 'health'),
      subtitle: AppStrings.t(context, 'healthSubtitle'),
      color: const Color(0xffc44747),
      photo: photo,
      onCamera: () => pick(ImageSource.camera),
      onGallery: () => pick(ImageSource.gallery),
      busy: busy,
      onAnalyze: analyze,
      extra: Column(children: [
        TextField(
            controller: symptoms,
            minLines: 3,
            maxLines: 5,
            decoration: InputDecoration(
                labelText: AppStrings.t(context, 'symptoms'),
                hintText: AppStrings.t(context, 'symptomsHint'),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none))),
        const SizedBox(height: 10),
        OutlinedButton.icon(
            onPressed: () => context.read<AppState>().toggleListening((text) {
                  symptoms.text = text;
                  setState(() {});
                }),
            icon: Icon(
                context.watch<AppState>().listening ? Icons.stop : Icons.mic),
            label: Text(context.watch<AppState>().listening
                ? AppStrings.t(context, 'stop')
                : AppStrings.t(context, 'voice')))
      ]),
      result: result == null
          ? null
          : _ResultCard(
              title: AppStrings.t(context, 'healthResult'),
              headline: result!.condition,
              confidence: result!.confidence,
              advice:
                  '${result!.advice}\n\n${result!.urgency}\n\n${AppStrings.t(context, 'notMedical')}',
              color: const Color(0xffc44747),
              onSpeak: () => context.read<AppState>().voice.speak(
                  '${result!.condition}. ${result!.advice}',
                  context.read<AppState>().locale.languageCode)));
}

class _ScanLayout extends StatelessWidget {
  final String title, subtitle;
  final Color color;
  final File? photo;
  final VoidCallback onCamera, onGallery, onAnalyze;
  final bool busy;
  final Widget? extra, result;
  const _ScanLayout(
      {required this.title,
      required this.subtitle,
      required this.color,
      required this.photo,
      required this.onCamera,
      required this.onGallery,
      required this.onAnalyze,
      required this.busy,
      this.extra,
      this.result});
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(20), children: [
        Text(title,
            style: Theme.of(context)
                .textTheme
                .headlineMedium
                ?.copyWith(fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 6),
        Text(subtitle),
        const SizedBox(height: 18),
        Container(
            height: 220,
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: color.withOpacity(.25))),
            child: photo == null
                ? Icon(Icons.image_search_rounded,
                    size: 70, color: color.withOpacity(.35))
                : ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.file(photo!, fit: BoxFit.cover))),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: onCamera,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: Text(AppStrings.t(context, 'takePhoto')))),
          const SizedBox(width: 10),
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: onGallery,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: Text(AppStrings.t(context, 'gallery'))))
        ]),
        if (extra != null) ...[const SizedBox(height: 14), extra!],
        const SizedBox(height: 14),
        FilledButton.icon(
            style: FilledButton.styleFrom(
                backgroundColor: color,
                padding: const EdgeInsets.symmetric(vertical: 16)),
            onPressed: busy ? null : onAnalyze,
            icon: busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.auto_awesome),
            label: Text(busy
                ? AppStrings.t(context, 'analyzing')
                : AppStrings.t(context, 'analyze'))),
        if (result != null) ...[const SizedBox(height: 18), result!]
      ]);
}

class _ResultCard extends StatelessWidget {
  final String title, headline, advice;
  final double confidence;
  final Color color;
  final VoidCallback onSpeak;
  const _ResultCard(
      {required this.title,
      required this.headline,
      required this.confidence,
      required this.advice,
      required this.color,
      required this.onSpeak});
  @override
  Widget build(BuildContext context) => Card(
      color: Colors.white,
      child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style: TextStyle(color: color, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(headline,
                style:
                    const TextStyle(fontWeight: FontWeight.w800, fontSize: 21)),
            if (confidence > 0) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(
                  value: confidence.clamp(0, 1), color: color),
              const SizedBox(height: 4),
              Text(
                  '${AppStrings.t(context, 'confidence')}: ${(confidence * 100).toStringAsFixed(1)}%')
            ],
            const SizedBox(height: 14),
            Text(advice),
            const SizedBox(height: 12),
            TextButton.icon(
                onPressed: onSpeak,
                icon: const Icon(Icons.volume_up_outlined),
                label: Text(AppStrings.t(context, 'speakResult')))
          ])));
}

class WeatherScreen extends StatelessWidget {
  const WeatherScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return ListView(padding: const EdgeInsets.all(20), children: [
      Row(children: [
        Expanded(
            child: Text(AppStrings.t(context, 'weatherTitle'),
                style: Theme.of(context)
                    .textTheme
                    .headlineMedium
                    ?.copyWith(fontWeight: FontWeight.bold))),
        IconButton(
            onPressed: state.loadWeather, icon: const Icon(Icons.refresh))
      ]),
      const SizedBox(height: 10),
      if (state.forecast.isEmpty)
        Text(AppStrings.t(context, 'noWeather'))
      else
        ...state.forecast.map((d) => Card(
            child: ListTile(
                leading: const Icon(Icons.calendar_today_outlined),
                title: Text(DateFormat('EEE, d MMM').format(d.date)),
                subtitle: Text(
                    '${AppStrings.t(context, 'rain')}: ${d.rain.toStringAsFixed(1)} mm'),
                trailing: Text(
                    '${d.max.toStringAsFixed(0)}° / ${d.min.toStringAsFixed(0)}°C'))))
    ]);
  }
}

class KnowledgeScreen extends StatefulWidget {
  const KnowledgeScreen({super.key});
  @override
  State<KnowledgeScreen> createState() => _KnowledgeScreenState();
}

class _KnowledgeScreenState extends State<KnowledgeScreen> {
  String query = '';
  @override
  Widget build(BuildContext context) {
    final all = context.watch<AppState>().entries;
    final list = all
        .where((e) =>
            '${e.title} ${e.body}'.toLowerCase().contains(query.toLowerCase()))
        .toList();
    return Column(children: [
      Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
              onChanged: (v) => setState(() => query = v),
              decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.search),
                  hintText: AppStrings.t(context, 'search'),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none)))),
      Expanded(
          child: list.isEmpty
              ? Center(child: Text(AppStrings.t(context, 'loading')))
              : ListView.builder(
                  itemCount: list.length,
                  itemBuilder: (_, i) {
                    final e = list[i];
                    return Card(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 6),
                        child: ExpansionTile(
                            leading: Icon(
                                e.health
                                    ? Icons.health_and_safety_outlined
                                    : Icons.grass_outlined,
                                color: e.health ? Colors.red : Colors.green),
                            title: Text(e.title,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)),
                            children: [
                              Padding(
                                  padding:
                                      const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                  child: Text(e.body))
                            ]));
                  }))
    ]);
  }
}
