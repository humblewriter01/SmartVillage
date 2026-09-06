# SmartVillage build, signing, voice, and model-improvement guide

## 1. Test offline Hausa voice on Android

The Hausa UI is available in the app language selector. Hausa speech depends on Android language packs installed on the specific phone; the app cannot download or guarantee a Hausa speech engine by itself.

1. Install the Android SDK, platform tools, Java 17, Flutter stable, and Git.
2. Clone the repository and enter it:

```bash
git clone https://github.com/humblewriter01/SmartVillage.git
cd SmartVillage
flutter pub get
flutter doctor
```

3. On the Android phone, enable **Developer options** and **USB debugging**, connect the phone, and accept the computer authorization prompt.
4. Confirm the device is visible:

```bash
flutter devices
adb devices
```

5. On the phone, open **Settings → System → Languages & input → Text-to-speech output**. Select the Google/Android speech engine, open its voice or language settings, and install Hausa if **Hausa (Nigeria)** or `ha-NG` is offered. Also open the keyboard or Google voice-typing language settings and download Hausa where available.
6. Run the app:

```bash
flutter run -d <ANDROID_DEVICE_ID>
```

7. In SmartVillage, switch the language control to **Hausa**, open Crop or Health, tap the speaker button, and listen. For recognition, open Health, tap the microphone button, speak a short Hausa phrase, and confirm that the text field is populated.
8. Repeat the test with mobile data and Wi-Fi disabled. Record whether text-to-speech and speech recognition still work. Android device vendors and installed engines differ, so a successful test on one model is not proof for every Tecno, Infinix, or Itel phone.

The app should fall back safely when Hausa is unavailable. It must not claim that voice recognition is offline unless the target device has been tested with connectivity disabled.

## 2. Local debug APK

```bash
flutter clean
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
adb install -r build/app/outputs/flutter-apk/debug/app-debug.apk
```

The debug APK is at `build/app/outputs/flutter-apk/debug/app-debug.apk`.

## 3. Release signing on a local machine

Do not commit a private keystore or `key.properties`. Create a keystore outside the repository:

```bash
keytool -genkeypair -v \
  -keystore "$HOME/smartvillage-release.jks" \
  -alias smartvillage \
  -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/key.properties` locally:

```properties
storePassword=REPLACE_WITH_KEYSTORE_PASSWORD
keyPassword=REPLACE_WITH_KEY_PASSWORD
keyAlias=smartvillage
storeFile=/absolute/path/to/smartvillage-release.jks
```

The current generated Gradle file uses the debug key for release builds. Before shipping a signed release, update `android/app/build.gradle.kts` to load `key.properties` and assign a release `signingConfig` from the private keystore. Verify the application ID, version, backup policy, permissions, privacy notice, and signing identity before publishing. Never send the keystore or passwords through chat or commit them to GitHub.

Then build:

```bash
flutter clean
flutter pub get
flutter build apk --release
```

The release APK is at `build/app/outputs/flutter-apk/release/app-release.apk`.

## 4. GitHub Actions release build

The repository includes a workflow at `.github/workflows/android.yml`. It always builds and uploads an unsigned/debug artifact for test builds. A signed release requires these repository secrets:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the `.jks` file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_KEY_ALIAS` | Usually `smartvillage` |

A signing workflow should only be enabled after the Gradle release signing block has been reviewed. GitHub Actions can create an APK; Vercel is not an appropriate Android signing system.

## 5. Improving the crop model with Python

The repository contains `tools/train_crop_model.py`. Place images in this structure:

```text
data/crops/
  cassava_healthy/*.jpg
  cassava_mosaic/*.jpg
  maize_healthy/*.jpg
  maize_leaf_blight/*.jpg
  rice_healthy/*.jpg
  rice_blast/*.jpg
```

Use only images with verified labels and documented consent/licensing. Keep field location, crop variety, lighting, disease confirmation method, and capture device in a separate dataset manifest. Do not train on images copied from the internet without redistribution permission.

Install the training environment and run:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r tools/requirements-train.txt
python tools/train_crop_model.py --data data/crops --out artifacts/crop_model --epochs 15
```

Before copying the model into the app, evaluate per-class precision, recall, confusion matrix, calibration, and performance on images from farms not represented in training. Copy only a reviewed model and matching `labels.txt` into `assets/models/crop/`, then run the Flutter tests.

Python is best used for dataset cleaning, augmentation, training, evaluation, quantization, and exporting TFLite. It should not silently replace the app’s verified label map or turn symptom text into an unvalidated medical diagnosis. A health model requires clinically governed data, verified preprocessing/output labels, ethics/privacy review, and independent evaluation.

## 6. Vercel versus Android

Vercel can host the static SmartVillage browser companion. It cannot provide the full native mobile feature set automatically. The browser build does not have the same guaranteed access to Android camera plugins, `sqflite`, native TFLite inference, Android speech engines, or APK signing. The Android APK must be built and signed locally or through a trusted CI runner such as GitHub Actions.

The practical deployment architecture is therefore:

| Target | Suitable platform | Features |
|---|---|---|
| Android APK | Local Flutter/Android SDK or GitHub Actions | Camera, TFLite, SQLite, native voice, offline operation |
| Browser companion | Vercel | Searchable verified guidance, bilingual content, online access |
| Cloud APIs | Optional server platform | Only if explicitly added later; requires privacy review and API keys |

## 7. API keys

The current repository needs no API key. Open-Meteo weather is keyless. The Python training workflow needs ordinary package installation and licensed datasets, not an API key. A future hosted speech, LLM, sync, analytics, or storage service would require its own credentials.
