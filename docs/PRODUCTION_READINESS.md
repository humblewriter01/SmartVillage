# SmartVillage production-readiness audit

## Executive assessment

SmartVillage is a functional **offline-first Android Flutter prototype** with bundled crop and health assets, bilingual UI, camera/gallery flows, voice pathways, cached weather, offline knowledge search, and SQLite history persistence. It is **not yet safe to describe as a clinically production-ready diagnostic product** because the health model’s public label/output contract has not been verified, Hausa offline speech availability depends on the device, and a release APK has not been built in this environment.

## API keys

No API key is required for the current implementation. Open-Meteo is called directly without an API key and is only used when a network is available. Crop inference, the health adapter, SQLite history, knowledge search, and text-to-speech do not require an API key. The app does not call Gemini, OpenAI, Google Cloud Speech, cloud storage, Firebase, or a hosted diagnosis service.

If a future version adds cloud speech recognition, hosted LLM advice, cloud sync, maps, or remote analytics, those would require separate credentials and explicit privacy/security review. They are not required by this build.

## Requested capability matrix

| Capability | Current status | Production note |
|---|---|---|
| Offline crop photo capture | Implemented | Requires Android camera permission and device testing |
| Offline crop model inference | Implemented with bundled KisanDoc TFLite model | Validate model accuracy on Nigerian field images |
| Crop top predictions | Implemented | Uses model labels and confidence scores |
| Crop recommendations | Implemented | Advisory text; confirm against local extension guidance |
| Crop image history | Implemented | Stored in SQLite as a record with optional local image path |
| Offline health photo flow | Implemented | The health result is intentionally conservative until labels are verified |
| Health symptom text input | Implemented | Does not diagnose; provides safety guidance |
| Health voice input | Implemented through device speech recognition | Offline Hausa support is device-dependent and not guaranteed |
| Health history | Implemented | Stored in SQLite with timestamp, symptoms/result, advice, and optional image path |
| English UI | Implemented | App-level translation map |
| Hausa UI | Implemented | Hausa strings are available through the app-bar language switcher |
| Hausa speech output | Attempted through Android TTS `ha-NG` | Works only if the device has a Hausa voice installed; must be tested on target phones |
| English speech output | Implemented through Android TTS | Device voice availability still applies |
| Offline voice recognition | Adapter present | `speech_to_text` delegates to installed Android recognition; fully offline behavior is not guaranteed |
| Offline knowledge base | Implemented | Bundled JSONL crop records plus health safety entries |
| Knowledge search | Implemented | Local text search without network |
| Live weather | Implemented | Open-Meteo, no key required |
| Cached weather fallback | Implemented | Uses SharedPreferences cache when a request fails |
| Low-end Android optimization | Partially implemented | Two TFLite threads and lazy model loading are used; benchmark on 2 GB devices |
| Single APK/no external runtime service | Intended | Flutter packages are bundled; Android build and permissions still need release verification |

## Repository integration scope

The public repositories were reviewed and their reusable architecture patterns were consolidated. The app does **not** literally include every feature from every repository because several source projects are demos, web apps, research prototypes, or use incompatible model formats. In particular, AgrioCrop’s ONNX/LLM pipeline, KrishiVaani’s server-side Flask/Gemini flow, AI Health Guardian’s Streamlit demo, and Aarogya Saathi’s broader health/pregnancy features were treated as references rather than copied wholesale. Combining all of their server/cloud features would contradict the offline-first and no-key requirements.

The integrated build uses the crop model and labels from KisanDoc, the offline knowledge-base pattern and crop model architecture from AgriScanDetection, a health model asset and health-history pattern from BIHealthScan, and voice/UI ideas from AgrioCrop, KrishiVaani AI, AI Health Guardian, Aarogya Saathi, and Smart Farmer. Attribution and integration details are in the root README.

## Release blockers before public deployment

A Flutter-enabled Android build machine must produce and install a release APK. The health model owner’s official labels, tensor shapes, preprocessing, and redistribution terms must be confirmed. Hausa speech recognition and Hausa TTS must be tested on the exact Tecno, Infinix, and Itel devices used in the field. Crop and health predictions require evaluation against a representative, locally collected and ethically governed test set. Privacy consent, data deletion, crash reporting policy, accessibility review, signed release configuration, and professional medical/agronomic review are also required.

The current automated checks pass: `flutter test` succeeds, and `flutter analyze --no-fatal-infos` completes with non-fatal lint/deprecation notices. A local APK build was attempted but could not run because the validation environment lacks the Android SDK.
