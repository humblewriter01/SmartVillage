# SmartVillage

SmartVillage is an offline-first Flutter application for rural Nigerian communities. It combines crop-leaf screening, health symptom guidance, bilingual English/Hausa interaction, cached weather, voice pathways, and an offline searchable knowledge base in one mobile experience.

## What is included

The app includes a unified five-tab experience: Home, Crop, Health, Weather, and Knowledge. Crop photos can be captured or selected from the gallery and are analyzed locally through the bundled KisanDoc MobileNetV2 TensorFlow Lite model. The health workflow accepts a photo and/or typed or spoken symptoms and uses a bundled health-model adapter with safe fallback guidance when the source model’s label contract is not verifiable. Weather uses Open-Meteo when a connection is available and caches the most recent forecast for offline viewing. The knowledge base is packaged in the application and remains searchable without a network connection.

English and Hausa are available from the app-bar language switcher. The voice layer uses Android speech recognition and text-to-speech when the installed device language packs support the requested locale. Native voice availability varies by device and should be checked during field testing.

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

## Safety boundary

SmartVillage is a screening and education aid, not a medical diagnostic device. It must not be used to delay urgent care, prescribe medicines, determine pregnancy status, or make treatment decisions without a qualified health worker. Crop recommendations are advisory and should be checked against local extension guidance and approved product labels.

## Public repositories reviewed

The implementation and integration boundaries were informed by the following public projects:

| Repository | Reused concept or asset | Attribution |
|---|---|---|
| [AgrioCrop](https://github.com/humayun-mhk/agriocrop-plant-disease-ai) | Flutter crop-classifier separation and image preprocessing patterns | Public repository reviewed; no code copied into the initial build |
| [KisanDoc](https://github.com/AsMetOP/KisanDoc) | MobileNetV2 TFLite crop model, labels, severity-oriented workflow, local history and TTS design | Model and labels copied into `assets/models/crop/`; retain upstream license obligations |
| [AgriScanDetection](https://github.com/is-project-4th-year/AgriScanDetection) | Offline-first capture → diagnose → explain flow and JSONL knowledge-base pattern | Knowledge asset copied into `assets/knowledge/`; retain upstream license obligations |
| [BIHealthScan](https://github.com/BCBLearning/BIHealthScan) | On-device health model asset and local health-history architecture | Health model copied into `assets/models/health/`; verify redistribution terms before release |
| [BioScan AI](https://github.com/arsenetuye80/bioscan-ai) | Health feature scope and multimodal screening reference | Public repository reviewed; no asset copied |
| [AI Health Guardian](https://github.com/RifahTasniaOrthi/AI-Health-Guardian) | Offline multimodal health UX and safety disclaimer pattern | Public repository reviewed; no asset copied |
| [Aarogya Saathi](https://github.com/erpranjalmishra/Aarogya-Saathi) | Flutter health navigation and local model integration reference | Public repository reviewed; no asset copied |
| [KrishiVaani AI](https://github.com/ankan123basu/KrishiVaaniAI) | Voice/image/text agronomy interaction reference | Public repository reviewed; no asset copied |
| [Smart Farmer PWA](https://smart-farmer-theta.vercel.app/) | Region-first farmer onboarding and simple task selection | Interaction pattern reviewed |

Before publishing an APK, add the complete upstream license texts for every redistributed model, dataset, knowledge record, and copied source file. The model files may have separate terms from their repositories.
