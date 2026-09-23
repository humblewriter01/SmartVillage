# SmartVillage (Web Application)

SmartVillage is an offline-first React and TypeScript web application for rural Nigerian communities. It combines crop-leaf screening, health symptom guidance, bilingual English/Hausa interaction, cached agro-weather, voice pathways, and an offline searchable knowledge base in a modern, responsive web experience.

## What is included

The app provides a unified six-tab experience: Home, Crop, Health, Weather, Knowledge, and History:
- **Home**: Quick status overview, action cards for crop and health checks, today's weather preview, and quick access to offline guidance.
- **Crop**: Leaf scanning using device camera, photo upload, or sample test leaves. Features offline computer vision analysis, disease classification across 15 agricultural classes, confidence scoring with safety thresholds, actionable advice, and detailed IPM (Integrated Pest Management) guides.
- **Health**: Visual and symptom-based health screening with voice input, quick symptom chips, severity assessments, urgency alerts, and medical disclaimers adhering to WHO guidelines.
- **Weather**: 7-day agro-weather forecasts from Open-Meteo with offline caching, support for major Nigerian agricultural regions (Abuja, Kano, Kaduna, Ibadan, Jos, Maiduguri, Sokoto, Enugu, Port Harcourt, Lagos), GPS location detection, and daily farming advisory tips.
- **Knowledge**: Fully offline searchable knowledge catalog covering major crops (cassava, maize, sorghum, rice, cowpea, tomato, yam, groundnut), livestock/poultry management, water safety, and rural health guidance with English and Hausa references.
- **History**: Local persistence for all diagnostic screenings with detail breakdown, actionable advice review, speech playback, and management.
- **Bilingual & Voice**: Instant switching between English and Hausa (`en` / `ha`), Web Speech API voice input and speech synthesis audio playback.

## Running the project

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Safety boundary

SmartVillage is a screening and education aid, not a medical diagnostic device. It must not be used to delay urgent care, prescribe medicines, determine pregnancy status, or make treatment decisions without a qualified health worker. Crop recommendations are advisory and should be checked against local extension guidance and approved product labels.

