# 🌿 Krishi Drishti — AI Smart Farming Assistant
### Smart India Hackathon 2026 · Problem Statement ID: 26180
**Team:** Krishi Drishti | **Category:** Hardware | **Theme:** Agriculture, FoodTech & Rural Development

---

## 🚀 Live Demo (Vercel)

Deploy instantly:
```bash
npx vercel --prod
```
Or connect this repo to [vercel.com](https://vercel.com) for auto-deploy on push.

---

## 📁 Project Structure

```
├── index.html              # Main UI shell (all panels)
├── styles.css              # Dark futuristic theme
├── js/
│   ├── sensors.js          # Sensor simulation engine (Gaussian noise + diurnal cycles)
│   ├── ai-engine.js        # Edge-AI inference (MobileNetV3, YOLOv8, XGBoost, LSTM)
│   ├── dashboard.js        # Live UI updater + Chart.js sparklines
│   ├── alerts.js           # Toast notifications + alert log + SMS simulation
│   ├── farm.js             # Three.js 3D farm scene
│   ├── problem-injection.js# Injection panel controller
│   └── main.js             # Boot orchestrator
├── vercel.json             # Vercel deployment config
├── package.json
└── README.md
```

---

## 🎮 Features

### Live Monitoring
- **14 live sensor parameters** updated every 1.8s with realistic Gaussian noise + diurnal cycles
- Soil: moisture, NPK (N/P/K), pH, temperature
- Atmospheric: air temp, humidity, rainfall, light intensity, wind speed
- Hydrology: canal water level
- Device: solar power, battery %, CPU load, RAM

### Edge-AI Inference Engine
| Model | Task |
|-------|------|
| MobileNetV3 | Disease detection (8 classes) |
| YOLOv8-nano | Pest detection (8 species) |
| XGBoost | Drought risk score |
| LSTM | Flood probability |
| Hybrid CNN | Nutrient deficiency |
| Rule-based | Irrigation decisions |
| Regression | Harvest readiness |

### Problem Injection Panel
Inject 6 types of agricultural stressors:
- 🦠 **Disease** — Late Blight, Wheat Rust, Powdery Mildew, Mosaic Virus, Loose Smut
- 🐛 **Pest** — Aphids, Stem Borer, Whitefly, Desert Locust, Spider Mite
- 🧪 **Nutrient Deficiency** — N, P, K, Fe, Zn
- ☀ **Drought** — Mild → Extreme
- 🌊 **Flood** — Flash, River, Waterlogging, Cyclone
- 🔥 **Heat Wave** — Warm spell → Extreme heat

### 3D Farm Scene (Three.js)
- 70+ animated crops with wind sway
- Solar panel + Edge-AI camera unit (RPi enclosure)
- 6 sensor nodes with glowing indicators
- Water canal with shimmer
- Drone patrol circuit
- Sky dome with stars
- Flood plane, dust particles
- Dynamic crop colour based on disease/drought state

### Alert System
- Toast notifications with deduplication
- Alert log with timestamps
- SMS alert simulation (offline-first gateway)
- Auto-irrigation action trigger
- Emergency mode

---

## 🏃 Run Locally

```bash
npx serve . -p 3000
# Open http://localhost:3000
```

---

## 📡 Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | Three.js r160 |
| Charts | Chart.js 4.4 |
| Icons | Font Awesome 6.5 |
| Fonts | Inter + Orbitron |
| Hosting | Vercel (static) |
| Edge Hardware (real) | RPi 4B + ESP32 |
| Connectivity | LoRaWAN + GSM fallback |

---

## 👥 Team Krishi Drishti

| Name | Roll | Department |
|------|------|-----------|
| Raunit | 24E36 | Electrical Engineering |
| Nainsi Kumari | 24E21 | Electrical Engineering |
| Nikhil Raj | 24E22 | Electrical Engineering |
| Aditya Aryan | 24E05 | Electrical Engineering |
| Satwik Kumar | 24E59 | Electrical Engineering |
| Sunny Raj | 24E51 | Electrical Engineering |

---

*SIH 2026 · PS-26180 · Agriculture, FoodTech & Rural Development*
