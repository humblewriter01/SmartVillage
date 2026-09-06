# SmartVillage

SmartVillage is an offline-first Flutter application for rural Nigerian communities. It combines crop-leaf screening, health symptom guidance, bilingual English/Hausa interaction, cached weather, voice pathways, and an offline searchable knowledge base in one mobile experience.

## What is included

The app includes a unified six-tab experience: Home, Crop, Health, Weather, Knowledge, and History. Crop photos can be captured or selected from the gallery and are analyzed locally through the bundled KisanDoc MobileNetV2 TensorFlow Lite model. The health workflow accepts a photo and/or typed or spoken symptoms and uses a bundled health-model adapter with safe fallback guidance when the source model’s label contract is not verifiable. Weather uses Open-Meteo when a connection is available and caches the most recent forecast for offline viewing. The knowledge base is packaged in the application and remains searchable without a network connection. Crop assessments and health records are persisted locally in `smart_village.db` using SQLite, with timestamps, results, advice, confidence, symptom text, and optional local image paths. The History tab supports refresh, expandable details, and swipe-to-delete.

English and Hausa are available from the app-bar language switcher. The voice layer uses Android speech recognition and text-to-speech when the installed device language packs support the requested locale. Native voice availability varies by device and should be checked during field testing.

## Build, test, and improve the app

See [`docs/BUILD_AND_TEST.md`](docs/BUILD_AND_TEST.md) for exact Android device testing, offline Hausa voice checks, debug/release APK commands, keystore signing, GitHub Actions artifacts, and Python crop-model training.

## Run the project

Install Flutter 3.16 or newer, connect an Android 8+ device or emulator, then run:

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```

The current development environment used to assemble this repository did not have the Flutter SDK installed, so APK compilation must be performed in a Flutter-enabled environment.

## Models and source integration

The project intentionally keeps model loading behind `lib/services/app_services.dart`. This prevents the UI from depending on a particular model format and makes it possible to replace a model after validating its input tensor, output tensor, labels, and license.

The crop asset and label map are derived from KisanDoc. The local knowledge file is derived from AgriScanDetection, with additional health safety entries authored for this application. The health asset is copied from BIHealthScan, but its public repository does not provide a verifiable label map in the inspected source tree; therefore SmartVillage does not present an unverified health-model output as a named medical diagnosis. Replace `HealthModelService.analyze` with the model owner’s verified preprocessing and label contract before clinical or production use.

## API keys

The current build does not require an API key. Open-Meteo is used without a key for optional live weather, while all other implemented workflows are local. The app does not call cloud LLMs, cloud speech services, Firebase, maps, or hosted diagnosis APIs.

## Safety boundary

SmartVillage is a screening and education aid, not a medical diagnostic device. It must not be used to delay urgent care, prescribe medicines, determine pregnancy status, or make treatment decisions without a qualified health worker. Crop recommendations are advisory and should be checked against local extension guidance and approved product labels.

## Rural-community roadmap

SmartVillage is being developed in practical phases. The current release provides offline crop screening, health safety guidance, English/Hausa UI and voice pathways, cached weather, searchable knowledge, SQLite history, and Android build automation. The next foundations are a seasonal planting calendar for rainy, dry, harmattan, planting, care, and harvest periods; water-safety education that clearly distinguishes visual screening from laboratory testing; and poultry-care records for flock size, vaccination reminders, feed, mortality, and warning signs.

The app will not claim that a photograph can accurately diagnose any plant, human illness, or water contaminant without a validated model and representative Nigerian evaluation data. New models must be trained, tested, licensed, and reviewed before they replace guidance-only fallbacks. Source provenance and license details are maintained in [`docs/ATTRIBUTIONS.md`](docs/ATTRIBUTIONS.md), while the production limitations are documented in [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md).

Before publishing an APK, retain complete upstream license texts for every redistributed model, dataset, knowledge record, and copied source file. The model files may have separate terms from their repositories.
