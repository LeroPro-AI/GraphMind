___             _    __  __ _         _ 
 / __|_ _ __ _ __| |_ |  \/  (_)_ _  __| |
| (_ | '_/ _` | '_ \ || |\/| | | ' \/ _` |
 \___|_| \__,_| .__/\_, |_|  |_|_|_||_\__,_|
              |_|   |__/

> **Interactive Neural Tracing Workspace & Story Architecture Engine** 

GraphMind is a premium, full-featured neural tracing workspace built in React 19, TypeScript, and D3.js. Designed specifically for novelists, tabletop worldbuilders, screenplay editors, and narrative historians, the platform utilizes advanced Generative AI models to convert plain, unstructured text into dynamic, multi-layered interactive knowledge networks. It maps intricate systems of characters, places, events, factions, and evidence into fully responsive physical simulations, allowing users to unlock semantic structures and discover hidden story patterns.

---

<p align="center">
  <img src="https://img.shields.io/badge/Vite-6.2.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/React-19.0.1-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/D3.js-7.9.0-F9A03F?style=for-the-badge&logo=d3.js&logoColor=white" alt="D3.js" />
  <img src="https://img.shields.io/badge/AI_Core-Gemini%20%7C%20Claude%20%7C%20OpenAI-blueviolet?style=for-the-badge" alt="AI Core" />
  <img src="https://img.shields.io/badge/Database-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase Synced" />
</p>

---

## 🚀 Features

GraphMind brings together cognitive narrative parsing, high-performance simulation physics, version branching, and real-time visualization:

*   **🧠 Real-Time AI Semantic Core Extraction**
    *   **Custom Prompt Blueprints**: Optimize AI extraction based on target context categories. Blueprints include **Creative Lore** (focuses on character arcs, items, species, myths), **Academic** (logic paths, evidence, citations, theories), **Professional** (stakeholders, technologies, processes), **Detective** (suspects, clues, timelines), and more.
    *   **Multi-Provider Fallback Broker**: Securely proxy extraction tasks to Gemini 2.0/3.5 Flash, Claude 3.5 Sonnet, GPT-4o, DeepSeek-V3, or Groq Llama 3 systems. If a provider API is slow or constrained, the backend failovers to fallback candidate paths immediately.

*   **⚡ High-Performance Physics Simulation & Topology**
    *   **4 Interactive Layout Topologies**: Render relationship nodes using **Force-Directed Gravity** (elastic physical vectors), **Circular Ring** (faction-chronology orbits), **Sequential Tree** (linage cascade networks), and **Matrix Grid** (coordinate mapping tables).
    *   **Auto-Settle & Freeze**: Features simulated gravity, active collision boundaries, repulsion strengths, and automatic simulation freezing to allow manual focus of node structures when forces settle.

*   **🔀 Version control & sandbox branching**
    *   Create sandboxed timeline variations or separate narrative directions via **Graph Branches**. Duplicate complex nodes into independent environments to prototype alternate world-states or narrative "What If" conditions without affecting the root archive.

*   **🔮 Interactive Side-by-Side Cognitive Helpers**
    *   **AI Summary Generator**: Summarizes large, complex networks into strict, structured 2-paragraph summaries analyzing central conflicts and connections.
    *   **"What If" Scenario Simulator**: Triggers simulated story changes. Select a character or node to inspect how its removal re-routes relationships across the network.
    *   **Logical Inconsistency Detector**: Traces gaps, contradiction loops, and chronological chronology issues across your story records with actionable resolution suggestions.
    *   **AI Auto-Complete Protocol**: Enhances a sparse canvas by generating 2 completely distinct narrative nodes and 3 links organically connected into your current story data.

*   **☁️ Collaborative Synces & Local Backups**
    *   Save, sync, and reload states with Google Firebase cloud persistence or local storage backups. Share instant workspace copies using URL-based parameters.

---

## 📸 Screenshots

![GraphMind Interface Mockup](https://raw.githubusercontent.com/username/project/main/screenshots/workspace_main.png)
*(Drop your custom screenshots at `screenshots/workspace_main.png` to preview the terminal-inspired dark interface.)*

---

## ⚡ Quick Start (Web Interface)

### 1. Configure Credentials
Open the App Settings in the interface, select **System Core**, paste your own free API Token credentials key (Gemini AI, OpenAI, DeepSeek, or Groq), and press save.

### 2. Supply Story Signal
Double-click inside the **Input Signal** field and paste your narrative essays, story outlines, complex conversation scripts, or screenplay pages.

### 3. Trace Neural Graph
Select your favorite AI engine, choose a template parser mode, and trigger **Execute Trace**. Watch as characters, locations, and events populate an interactive canvas.

---

## 💻 Local Setup & Developer Guide

Follow these instructions to run the GraphMind server and client workspace on your local machine.

### 1. Verification & Repository Installation
First, clone the codebase assets to your terminal and install the project dependencies:

```bash
# Clone repository assets
git clone https://github.com/your-username/graphmind-ai.git
cd graphmind-ai

# Install high-performance workspace dependencies
npm install
```

### 2. Configure Local Environment Variables
Create a local `.env` configuration file in the project's root folder based on our environment template:

```bash
cp .env.example .env
```

Open `.env` in your text editor and furnish your authentication parameters and API keys:

```env
# Google Gemini Generative API core key (Accessed server-side only)
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Admin SDK Configuration (Optional, for neural repository cloud saving/sharing)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

> ⚠️ **Key Safety Rules**: To prevent security breaches, server-side API keys (`GEMINI_API_KEY` etc.) are kept private and never exposed to client browsers. Never prefix sensitive keys with `VITE_`.

### 3. Setup Firebase Core Databases (Configuring Persistence)
If you wish to utilize cloud saves, collaboration deep-links, and the neural archive explorer:
1. Navigate to the **[Google Firebase Console](https://console.firebase.google.com/)** and provision a new project.
2. Under **Build**, activate **Firestore Database** in production or test mode.
3. Deploy safety validation filters locally using our schema file `firestore.rules` or configure them inside the rules interface tab.
4. Download your workspace frontend project variables config helper copy (often named `firebase-applet-config.json` or config object settings) and place it in the app workspace root to authorize client sessions.

### 4. Directing Dev Run Engines & Ports

GraphMind runs as an Express backend utilizing a modern Vite dev server middleware proxy. Launch the local dev server using:

```bash
# Spark the Express proxy backend and client workspace
npm run dev
```

*   **Port Config**: The dev integration server is set to run by default on **port `3000`** (`http://localhost:3000`).
*   **Compile Bundles for Production**:
    ```bash
    npm run build
    npm run start
    ```
    This triggers Vite's build compiler to output optimized static HTML components in `dist/` and runs Esbuild to bundle the Express `server.ts` proxy controller into a standalone CommonJS execution file (`dist/server.cjs`).

---

## 🤖 Supported AI Providers

| Provider | Supported Engine | Free Tier Info | Console Link |
| :--- | :--- | :--- | :--- |
| **Gemini (Google AI)** | `gemini-3.5-flash` <br> `gemini-2.0-flash` | Millions of complimentary input tokens per month | [Google AI Studio Console](https://aistudio.google.com/) |
| **Claude (Anthropic)** | `claude-3-5-sonnet` | Initial developer testing evaluation credits | [Anthropic Developer Console](https://console.anthropic.com/) |
| **DeepSeek** | `deepseek-chat` (V3) | Extremely low cost pricing with free starter tokens | [DeepSeek Open Portal](https://platform.deepseek.com/) |
| **OpenAI** | `gpt-4o` | Structured output parsing with new developer grants | [OpenAI API Console](https://platform.openai.com/) |
| **Groq Cloud** | `llama-3.3-70b-versatile` | Ultra-high throughput speeds with free daily limits | [Groq Developer Console](https://console.groq.com/) |

---

## ⚙️ How It Works

```
[ User Input Text ] 
        │
        ▼
[ Local Proxy Request ]  ──► Auth & Secure Headers Handshake (/api/handshake)
        │
        ▼
[ AI Prompt Synthesis ]  ──► Embed Schema Definitions & Selected Mode
        │
        ▼
[ Selected Model API ]   ──► Generates strictly structured JSON object (Zod Guarded)
        │
        ▼
[ App State Mutation ]   ──► React State updates and pushes history into Undo/Redo queues
        │
        ▼
[ D3.js Force Layout ]   ──► Calculates physics simulation values and dynamically paints canvas
```

### Dynamic Lore Prompt Structure
The Generative Model expects to process text and output a reliable, structured schema that is parsed by the React canvas. The internal JSON return format from the AI looks exactly like this:

```json
{
  "title": "A short, evocative title for this knowledge map",
  "nodes": [
    { 
      "id": "merlin_the_mage", 
      "label": "Merlin", 
      "type": "person", 
      "description": "High counselor of Avalon and keeper of the primordial runes." 
    },
    {
      "id": "avalon_citadel",
      "label": "Avalon",
      "type": "location",
      "description": "An ancient floating stone fortress protected by fog barriers."
    }
  ],
  "links": [
    { 
      "source": "merlin_the_mage", 
      "target": "avalon_citadel", 
      "label": "guards" 
    }
  ]
}
```

---

## 📁 Code Structure

```text
├── .env.example               # Reference template listing server credentials
├── package.json               # Defines standard build tasks, vite paths, and dependencies
├── server.ts                  # Security-first Express backend proxy executing AI models & authorization
├── firestore.rules            # Security-hardened permissions protecting saved user archives
├── index.html                 # Standard index page bootstrapping main script
├── src/
│   ├── main.tsx               # Primary React script entering standard container
│   ├── App.tsx                # Central logic director coordinating views, sidebars, and helpers
│   ├── types.ts               # Complete type definitions specifying nodes, links, and settings
│   ├── components/
│   │   ├── GraphCanvas.tsx    # Implements D3 force simulation, dragging layers, and SVG elements
│   │   ├── HelpAndGuide.tsx   # Premium search-filtered help panels and interactive tutorials
│   │   └── SettingsPanel.tsx  # Grid structure to handle appearance preferences & custom settings
│   ├── context/
│   │   └── SettingsContext.tsx # Context provider saving parameters cleanly to localstorage
│   ├── hooks/
│   │   └── useGraphMutations.ts # Custom callbacks manipulating nodes, updating states, or drawing links
│   └── lib/
│       └── firebase.ts        # Bootstraps Fire auth services, database connections, and errors
```

### Complete Code Details

*   **`server.ts`**: The backend orchestrator configured for Cloud Run sandboxes. It features security-hardened headers, session handshake checking, API rate limiting, and an endpoint routing broker. It houses functions like `tryGemini` and `tryOpenAI` to securely proxy text extractions, coordinate summary requests, and synthesize sandbox nodes on port `3000`.
*   **`src/App.tsx`**: The nervous system of the client app. This component manages primary structural rendering, layout drawer shifts, Firebase user session handshakes, branch state tracking, and triggers fetch requests to AI help routes like `/api/gemini-what-if` and `/api/gemini-detect-inconsistency`.
*   **`src/components/GraphCanvas.tsx`**: The interactive canvas. Powered by D3.js, it manages zoom transformations, custom color overlays, Arrow link indicators, and drag gestures. It implements standard layouts by binding parameters like `d3.forceManyBody` and `d3.forceLink` recursively.
*   **`src/components/SettingsPanel.tsx`**: Handles fine-tuning. It presents interactive sliders and category forms to adjust physics coefficients (such as link thickness, repulsion rates), toggle the core lighting theme, and select standard language outputs.
*   **`src/components/HelpAndGuide.tsx`**: Premium documentation center. Features real-time index-keyword search, mobile scrollable navigation tabs, visual interactive layout diagrams, and collapsible FAQ logic.
*   **`src/hooks/useGraphMutations.ts`**: High-performance mutation state managers. Exporting critical helpers like `handleUpdateNode`, `handleDeleteNode`, `handleAddNode`, and `handleAddLink` to securely manipulate JSON graphs on manual canvasing.
*   **`src/context/SettingsContext.tsx`**: Saves the user configuration environment variables. It abstracts `DEFAULT_SETTINGS` and handles synchronized configuration storage across standard browser resets.

---

## 🎛️ Graph Controls

| Control | Icon / Indicator | What It Does |
| :--- | :--- | :--- |
| **Generate Map** | `Sparkles` | Hands the input context prompt to the backend AI to extract story structures. |
| **Reset Zoom** | `Maximize2` | Rescales the canvas coordinates and re-centers the network inside your screen. |
| **Toggle Labels** | `Eye` | Displays or hides node text labels to keep visual layouts organized. |
| **Freeze Graph** | `Lock` | Stops all real-time simulation physics forces in the viewport instantly. |
| **Clear View** | `RotateCcw` | Resets the active graph database, cleaning the workspace. |
| **Layout Switcher** | `Network` | Rotates the placement topology between Force, Circular, Tree, and Grid. |
| **Edit Mode** | `Code` / `Pencil` | Enables clicking, manual additions, editing text descriptions, and deleting links. |
| **Undo / Redo** | `Undo` / `Redo` | Rewinds or fast-forwards through layout actions and manual revisions. |
| **Branches Control** | `GitBranch` | Fork a neural copy of a story timeline into an independent experimental path. |
| **Share Graph** | `Share2` | Synchronizes parameters with Fire database and copies deep links to clipboard. |

---

## 🎨 Node Types & Styles

Categorize your network structures using 21 explicit node classifications. Custom colors help paint a high-contrast visual hierarchy on screen:

| Node Type | Main Color Hex | Legend Descriptor & Use Cases |
| :--- | :--- | :--- |
| **Person** | `#F5C842` | Primary characters, narrative entities, key historical figures, or core actors. |
| **Location** | `#10B981` | Physical settings, realms, architectural facilities, planets, or territories. |
| **Event** | `#3B82F6` | Narrative incidents, battles, councils, timeline milestones, or historical actions. |
| **Object** | `#A855F7` | Key functional items, weapons, crucial evidence, relics, or tools. |
| **Concept** | `#8B5CF6` | Esoteric theories, physical laws, political philosophies, or cosmic factors. |
| **Faction** | `#6366F1` | Factions, guilds, corporate lobbies, alliances, or state military orders. |
| **Ability** | `#F43F5E` | Signature techniques, magic capabilities, psychic potential, or custom protocols. |
| **Organization** | `#34D399` | Structured commercial or global institutions. |
| **Species** | `#F472B6` | Fantasy or sci-fi races, entities, alien types, or ecological categories. |
| **Artifact** | `#F59E0B` | Magic items or ancient, legendary machinery. |
| **Technology** | `#06B6D4` | Cybernetic equipment, starships, software, or advanced devices. |
| **Theme** | `#EC4899` | Central moral questions, motives, or underlying narrative sub-texts. |
| **Process** | `#14B8A6` | Workflows, manufacturing pipelines, or political election steps. |
| **Goal** | `#10B981` | Narrative objectives, corporate targets, or character motivations. |
| **Evidence** | `#EF4444` | Clues, fingerprints, DNA proofs, or historic records for investigation. |
| **Timeline** | `#6B7280` | Age, epoch dates, calendar structures, or specific sequence dates. |
| **Data** | `#3B82F6` | Raw records, terminal files, binary outputs, or logs. |
| **Law** | `#F59E0B` | State rules, royal treaties, physics laws, or divine commandments. |
| **Myth** | `#8B5CF6` | Legends, historic rumors, forgotten pantheons, or prophecies. |
| **Theory** | `#6366F1` | Scientify hypotheses, investigative solutions, or logical explanations. |
| **Role** | `#F5C842` | Fictional titles, social standings, positions, or active duties. |

---

## ⚙️ Settings Reference

### Appearance Controls
*   **Show Arrows**: Displays directed head arrows outlining the relationship flow paths.
*   **Node Sizing Scale**: Adjusts the radius scale of circle node overlays based on connection ratios.
*   **Label Size Scale**: Alters text point size adjacent to entity centroids for fine legibility.
*   **Link Line Thickness**: Modifies pixel thickness of connection links across the canvas.
*   **Theme Selection**: Switches from modern Hacker Dark mode to high-contrast Cosmic Light mode.

### Physics Simulation
*   **Gravity Strength**: Adjusts pull rate of node clusters toward the central centroid coordinates.
*   **Link Spacing Distance**: Set the targeted spring distance of relationship links.
*   **Repulsion Force**: Defines repulsive strength pushing neighboring nodes away to prevent card nesting.
*   **Auto-Freeze Protocol**: Stops real-time physics simulation loops after force dynamics settle.

### AI Constraints & Models
*   **Model Provider Selection**: Selects model server endpoints (Gemini, Claude, DeepSeek, Groq, etc.).
*   **Maximum Node Limits**: Sets cut-off point limiting total entities AI can generate.
*   **Detail Parse Level**: Toggle high-level structure summaries or deep, exhaustive relationship mappings.
*   **Language Selection**: Forces AI to label elements in English, Spanish, Japanese, German, etc.

---

## 🔒 Privacy & Local Security

1.  **Strict Sandbox Run**: Because all parsing processing compiles in a sandboxed iframe view, GraphMind contains zero hidden trackers. No external server logs are generated.
2.  **Encrypted Sync Handshakes**: Firebase database operations, collaborative URL generation, and session authorizations execute under end-to-end sandbox validations. 
3.  **No AI Content Re-Training**: The underlying Generative models process elements using personal API keys. Your custom context data, screenplays, and corporate documents are **never** utilized to re-train future public algorithms.

---

## 🤝 Contributing

Contributions are welcomed! Whether you want to improve physics simulation calculations, expand the custom node icon palettes, or integrate even more AI providers:

1.  Fork the repository and clone it locally
2.  Create a fresh, specific branch to host alterations
3.  Commit clean, self-contained adjustments
4.  Open a detailed Pull Request explaining your changes

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE). Feel free to bundle, remix, or integrate it into larger worldbuilding software suites.
