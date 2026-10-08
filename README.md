# SmartVillage

SmartVillage is a comprehensive, offline-first web and mobile application engineered for rural Nigerian farmers, families, and remote agricultural communities. Developed by **Hausa Cybertech** in Kano, Nigeria, SmartVillage bridges critical information gaps in agrarian regions by delivering on-device computer vision, veterinary diagnostics, water quality testing, seasonal planting calendars, interactive offline maps, and emergency S.O.S distress broadcasting without requiring an active internet connection.

🌐 **Website**: [https://hausacybertech.vercel.app/](https://hausacybertech.vercel.app/)  
📧 **Email**: [ameenujaafar432@gmail.com](mailto:ameenujaafar432@gmail.com)  
📱 **WhatsApp**: [+234 806 371 2192](https://wa.me/2348063712192)

---

## Core Pillars

- **100% Offline-First Architecture**: Diagnostic screenings, disease encyclopedias, veterinary triage, soil analysis, and knowledge bases operate entirely on-device without internet access.
- **Bilingual English & Hausa**: Instant one-tap language switching (`en` / `ha`) with native cultural and agricultural terminology tailored to Nigerian rural contexts.
- **Voice-First Accessibility**: Comprehensive Web Speech API and native Capacitor Text-to-Speech (TTS) integration across every module, enabling full audio playback and voice dictation for low-literacy users.
- **Android Compatibility (Android 7.0 to 15)**: Multi-scheme APK signing (v1, v2, v3, v4) ensuring flawless installation on older rural smartphones (such as Vivo and older Transsion devices) as well as modern Android handsets.

---

## Complete Feature Suite

### 1. Home Dashboard & Quick Hub
- **Status Overview**: Instant offline readiness indicator, localized date display, and quick action cards.
- **Emergency S.O.S Distress Card**: One-tap emergency broadcast that transmits distress signals via SMS with high-precision GPS coordinates, audible alarm siren, and pre-formatted bilingual templates.
- **Harvest Countdown Widget**: Live progress card showing days remaining until crop maturity and active growth stages.
- **Agro-Weather Preview**: Real-time summary of current regional weather and daily farming advisory tips.
- **Voice Navigator**: One-tap voice search to instantly open any feature by speaking in English or Hausa.

### 2. Crop Health Leaf Scanner
- **Offline Computer Vision**: On-device leaf image analysis classifying diseases across 15 major agricultural categories (Cassava, Maize, Tomato, Rice, Cowpea, Pepper, Yam, etc.).
- **Confidence Scoring & Safety Gates**: Real-time confidence evaluation with clear warning banners for inconclusive or low-light scans.
- **Integrated Pest Management (IPM)**: Detailed organic, mechanical, and approved chemical remedies with dosage, withholding periods, and prevention measures.
- **Multi-Source Ingestion**: Live camera capture via `@capacitor/camera`, gallery upload, or pre-loaded sample leaves for offline demonstration.
- **Voice Read-Aloud**: Full audio playback of diagnostic results and IPM instructions in English or Hausa.

### 3. Crop Disease Visual Reference Library
- **Searchable Visual Encyclopedia**: Browse high-resolution images, disease profiles, and symptom descriptions across major staple crops.
- **Direct Diagnosis Linking**: One-tap transition from reference library items into the active diagnosis workflow.
- **Bilingual Botanical Nomenclature**: English and local Hausa names for pests, fungi, viruses, and environmental deficiencies.

### 4. Rural Health Symptom Triage
- **Visual & Symptom Screening**: Structured symptom selection for common rural health concerns (Malaria, Typhoid, Cholera, Dysentery, Snakebite, Respiratory infections).
- **Red Flag Urgency Alerts**: Immediate emergency warnings for life-threatening symptoms (high fever with convulsions, severe dehydration, difficulty breathing).
- **Voice Input & Synthesis**: Voice-guided symptom reporting and full speech playback.
- **WHO Safety Compliance**: Prominent medical disclaimers and emergency referral recommendations adhering to World Health Organization primary healthcare guidelines.

### 5. Livestock & Poultry Disease Checker
- **9 Animal Categories**: Targeted veterinary disease models for Chickens, Goats, Sheep, Cattle, Donkeys, Camels, Pigs, Ducks, and Turkeys.
- **Single-Select Symptom Triage**: Streamlined symptom selection with instant deselect toggling and voice pronunciation.
- **Weighted Differential Scoring**: Clinically weighted diagnostic engine identifying likely diseases, secondary differentials, severity ratings, and contagious warnings (e.g., CBPP, PPR, Newcastle, Blackhead, ASF).
- **Authentic Animal Audio**: Native sound effects for each animal species to assist low-literacy identification.

### 6. Livestock Vaccination Schedules & Notification Reminders
- **Routine Immunization Timelines**: Species-specific vaccination, deworming, and biosecurity schedules (LaSota, Gumboro, PPR, CBPP, Blackleg, Anthrax, Tetanus).
- **Native Local Notifications**: Schedule and manage automated device reminders using `@capacitor/local-notifications` that trigger even when the app is closed.

### 7. Drinking Water Quality & Safety Analyzer
- **Multi-Parameter Physical Evaluation**: Turbidity (clarity), color, odor, and taste assessments.
- **Standards Benchmarking**: Real-time evaluation against World Health Organization (WHO) and Nigerian Standard for Drinking Water Quality (NSDWQ) potable limits.
- **Purification Guides**: Step-by-step instructions for Solar Water Disinfection (SODIS), cloth filtration, boiling, and household chlorination (WaterGuard/bleach dosing).

### 8. Seasonal Planting Calendar & Agro-Ecological Zones
- **Nigerian Ecological Zones**: Tailored planting schedules for Sahel Savanna, Sudan Savanna, Northern/Southern Guinea Savanna, and Rainforest zones.
- **Crop Timelines**: Sowing dates, weeding intervals, fertilizer top-dressing milestones, companion planting pairings, and expected harvest windows.
- **Hausa Farming Terms**: Deep integration of indigenous agricultural concepts (*Daminna*, *Rani*, *Fadama*, *Kunya*).

### 9. Soil Health & Texture Analyzer
- **Offline Jar Test Calculator**: Soil texture classification (Sandy, Loamy, Clay, Silty) via percentage calculations from settling layers.
- **Soil Ribbon Test Guide**: Physical texture assessment through manual soil feel and ribbon formation.
- **pH & Moisture Diagnostics**: Crop suitability recommendations and natural soil amendment guidance (wood ash, agricultural lime/dolomite, organic compost).

### 10. Harvest Countdown & Growth Phase Tracker
- **Planting-to-Harvest Progress**: Visual progress bar tracking days elapsed, days remaining, and estimated harvest date.
- **Growth Stage Guidance**: Stage-by-stage agronomic advice from germination and tillering/vegetative growth to flowering, grain filling, and ripening.

### 11. Offline Leaflet Maps & Agricultural Geo-Pinning
- **100% Offline Leaflet Maps**: Tile caching and interactive spatial navigation with zero network dependency.
- **Agricultural Pinning**: Place and label custom map markers for water points/boreholes, veterinary centers, weather stations, and crop zones.
- **Fast-Pass Geolocation**: GPS location tracking with instant offline centering, 60-second hardware buffer checks, and last-known location fallbacks with accuracy and age indicators.
- **Voice Read-Out**: Audio narration of pin coordinates and facility notes.

### 12. 7-Day Regional Agro-Weather Forecast
- **Regional Nigerian Coverage**: Pre-configured regional forecasts for Kano, Kaduna, Sokoto, Maiduguri, Jos, Abuja, Ibadan, Enugu, Port Harcourt, and Lagos.
- **Offline Weather Caching**: 7-day temperature, rainfall probability, wind speed, and humidity forecasts cached locally via Open-Meteo.
- **Agronomic Weather Advisories**: Practical daily farming recommendations based on rain forecasts (e.g., optimal spraying, sowing, or weeding days).

### 13. Offline Searchable Knowledge Base
- **Comprehensive Knowledge Catalog**: In-depth offline guides covering crop agronomy, pest management, livestock husbandry, hygiene, water safety, and emergency first aid.
- **Instant Search**: Bilingual search filtering by keyword, category, or crop type.

### 14. Screening History & Archives
- **Secure Local Storage**: Automatically archives every crop diagnosis, health triage, livestock check, and water assessment with full timestamps and detail breakdowns.
- **Audio Replay & Management**: Re-listen to historical advice or clear records as needed.

### 15. About & Project Attribution
- **Creator & Organization**: Hausa Cybertech, founded by Ameenu Umar Jaafar (pen name: Humble-writer) in Kano, Nigeria.
- **Dual Licensing Information**: Direct details on AGPL-3.0 community open-source rights and commercial licensing terms.
- **Bilingual TTS Overview**: Complete audio overview of the project vision and contact avenues.

---

## Technical Stack & Architecture

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons |
| **Mobile Runtime** | Capacitor 8 (Android & iOS native runtime) |
| **Hardware & Plugins** | `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/local-notifications`, `@capacitor/filesystem`, `@capacitor-community/text-to-speech`, `capacitor-voice-recorder` |
| **Mapping Engine** | Leaflet 1.9 with custom offline tile caching and divIcon markers |
| **Speech & Audio** | Web Speech API, Capacitor TTS, Web Audio API (S.O.S Siren synth), HTML5 Audio |
| **State & Persistence** | Offline `localStorage`, reactive event-based audio listeners |

---

## Android Build & Signing

The Android project is pre-configured with support for all four Android signing schemes in `android/app/build.gradle`:

```groovy
signingConfigs {
    release {
        enableV1Signing = true // Required for Android 7.0 - 8.1 (Vivo, Transsion devices)
        enableV2Signing = true // Android 7.0+ APK Signature Scheme v2
        enableV3Signing = true // Android 9.0+ APK Signature Scheme v3
        enableV4Signing = true // Android 11.0+ APK Signature Scheme v4
    }
}
```

This prevents the common `"Parse Error: There was a problem parsing the package"` on older Android handsets widely used throughout rural Africa.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Android Studio & Android SDK (for native Android builds)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/hausacybertech/smartvillage.git
cd smartvillage

# Install dependencies
npm install

# Start the Vite development server (port 3000)
npm run dev
```

### Production Web Build

```bash
npm run build
```

### Sync & Run Android App

```bash
# Build web assets and sync to native Android project
npm run build
npx cap sync android

# Open project in Android Studio
npx cap open android
```

---

## Safety Boundary & Medical Disclaimer

SmartVillage is a screening, triage, and educational tool designed to assist rural communities. It is **not** an accredited medical or veterinary diagnostic laboratory. It must **not** be used to delay urgent medical care, prescribe controlled pharmaceuticals, determine pregnancy status, or override professional clinical diagnoses. Crop and veterinary recommendations are advisory and should be cross-referenced with local agricultural extension workers and official product safety labels.

---

## License

This project is dual-licensed:

- **AGPL-3.0** — Free for open-source and community use. See [LICENSE](LICENSE) for details. Any modified version made available over a network must release its source code under the same license.
- **Commercial License** — Available for organizations that wish to use SmartVillage in a proprietary product or service, or that require legal indemnification, warranty, or priority support. See [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) for details.

If you wish to use SmartVillage in a proprietary product or service without open-sourcing your modifications, you must obtain a commercial license.

### Contact for commercial licensing

**Ameenu Umar Jaafar**  
Hausa Cybertech  
🌐 Website: [https://hausacybertech.vercel.app/](https://hausacybertech.vercel.app/)  
📧 Email: [ameenujaafar432@gmail.com](mailto:ameenujaafar432@gmail.com)  
📱 WhatsApp: [+234 806 371 2192](https://wa.me/2348063712192)  

© 2026 Hausa Cybertech. All rights reserved.

