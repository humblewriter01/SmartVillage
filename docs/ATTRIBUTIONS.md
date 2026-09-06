# SmartVillage attribution and source provenance

The implementation and integration boundaries were informed by the following public projects. This file keeps source provenance available for maintainers without placing a repository-review section in the user-facing README.

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

Before publishing an APK, retain complete upstream license texts for every redistributed model, dataset, knowledge record, and copied source file. Model files may have separate terms from their repositories.
