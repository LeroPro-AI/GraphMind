import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import { z } from 'zod';
import fs from 'fs';

dotenv.config();

// Load Firebase Config safely
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Admin with enhanced safety and logging
try {
  const currentApps = getApps();
  console.log('Firebase Config Loaded. ProjectID:', firebaseConfig.projectId);
  
  if (currentApps.length === 0) {
    initializeApp({
      projectId: firebaseConfig.projectId,
      credential: admin.credential.applicationDefault()
    });
    console.log('Firebase Admin: Initialized with Application Default Credentials.');
  } else {
    console.log('Firebase Admin: Already active instance found.');
  }
} catch (adminErr) {
  console.error('Firebase Admin: Initialization failed. Attempting fallback...', adminErr);
  try {
    if (getApps().length === 0) {
      initializeApp({ projectId: firebaseConfig.projectId });
      console.log('Firebase Admin: Initialized with basic config fallback.');
    }
  } catch (fallbackErr) {
    console.error('Firebase Admin: Total failure:', fallbackErr);
  }
}

const app = express();
const PORT = 3000;

// Trust Proxy for Cloud Run/Proxied environments (resolves express-rate-limit warning)
app.set('trust proxy', 1);

// Logging
app.use(morgan('dev')); // Use dev format for cleaner logs

// Security: Headers - Temporarily loosening for troubleshooting
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP temporarily to rule it out
  frameguard: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Security: Cookie parsing
app.use(cookieParser());

// Security: Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }, // Disable the check that causes the Forwarded header warning
  message: { error: 'Too many requests, please try again later.' }
});

app.use(express.json({ limit: '5mb' }));

// Auth Middleware
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error: any) {
    console.error('Firebase Auth Error:', error.code, error.message);
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid token',
      reason: error.code || 'Verification failed' 
    });
  }
}

// Key validation helper
function getValidKey(userKey?: string, envKey?: string): string | undefined {
  if (!userKey || userKey.trim() === '' || userKey.startsWith('Validation')) return envKey;
  return userKey;
}

// Security: Session Handshake
app.get('/api/handshake', (req, res) => {
  res.cookie('protocol_verified', 'true', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  });
  res.json({ status: 'Operational', trace_id: Math.random().toString(36).substring(7) });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    firebaseAdminReady: getApps().length > 0,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasLLMAPIKey: !!process.env.LLMAPI_KEY,
    hasAkiKey: !!process.env.AKI_KEY,
    nodeEnv: process.env.NODE_ENV
  });
});

// Gemini configuration
if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. Extraction features will be disabled.');
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Input Validation Schema
const extractSchema = z.object({
  text: z.string().min(10, "Text is too short").max(50000, "Text is too long"),
  settings: z.object({
    maxNodes: z.number().optional(),
    detailLevel: z.string().optional(),
    language: z.string().optional(),
    provider: z.string().optional(),
    mode: z.string().optional(),
    keys: z.object({
      gemini: z.string().optional(),
      openai: z.string().optional(),
      groq: z.string().optional(),
    }).optional(),
  }).optional(),
});

// AI PROMPTING LOGIC
const SYSTEM_PROMPT = (text: string, maxNodes = 25, detailLevel = 'deep', language = 'English', mode = 'general') => {
  const modeGuidance: Record<string, string> = {
    general: "Extract key entities and relationships for a comprehensive overview.",
    creative: "Focus on character arcs, lore, worldbuilding, plot hooks, and thematic connections. Use types like 'species', 'artifact', 'faction', 'role', 'myth'.",
    academic: "Focus on concepts, theories, evidence, citations, and logical flow. Use types like 'theory', 'data', 'evidence', 'timeline', 'organization'.",
    professional: "Focus on stakeholders, processes, goals, risks, and technical architecture. Use types like 'organization', 'technology', 'process', 'goal'.",
    personal: "Focus on life events, acquaintances, travel routes, and personal knowledge clusters. Use types like 'person', 'location', 'event', 'object'.",
    detective: "Focus on suspects, clues, motives, evidence, and timelines. Use 'evidence', 'timeline', 'role', 'organization'."
  };

  const allowedTypes = [
    'person', 'location', 'event', 'object', 'concept', 'other', 
    'organization', 'species', 'artifact', 'technology', 'theme', 
    'process', 'goal', 'evidence', 'timeline', 'faction', 
    'data', 'law', 'myth', 'theory', 'role'
  ];

  return `
  You are a sophisticated knowledge graph extractor. Your task is to analyze the provided text and transform it into a structured neural map.
  
  Configuration:
  - Macro Blueprint: ${mode.toUpperCase()} - ${modeGuidance[mode] || modeGuidance.general}
  - Context Depth: ${detailLevel === 'deep' ? 'Maximum exhaustive analysis' : 'High-level structural summary'}
  - Language: Use ${language} for all labels and descriptions.
  - Node Density: Aim for approximately ${maxNodes} interconnected entities.
 
  Instructions:
  1. Identify key entities relevant to the ${mode} blueprint.
  2. Map directional relationships (source -> target) with active-voice relationship labels.
  3. Ensure every node has a concise 1-sentence description based strictly on the context.
  
  Output Format:
  Return ONLY a valid JSON object with this exact structure:
  {
    "title": "A short, evocative title for this knowledge map",
    "nodes": [
      { 
        "id": "unique_lowercase_id", 
        "label": "Display Name", 
        "type": "${allowedTypes.join('|')}", 
        "description": "Brief contextual summary" 
      }
    ],
    "links": [
      { 
        "source": "source_id", 
        "target": "target_id", 
        "label": "relationship verb" 
      }
    ]
  }
  
  Guidelines:
  - Higher-importance entities should have more connections.
  - Use specific node types from the allowed list to categorize accurately.
  - The "title" should capture the essence of the input signal.

  Signal Trace to Analyze:
  ${text}
`;
};

async function tryGemini(text: string, settings?: any, modelName = "gemini-3.5-flash") {
  const apiKey = getValidKey(settings?.keys?.gemini, process.env.GEMINI_API_KEY);
  if (!apiKey) throw new Error('Gemini Key Missing');
  
  const client = (apiKey !== process.env.GEMINI_API_KEY) ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) : ai;
  
  const prompt = SYSTEM_PROMPT(
    text, 
    settings?.maxNodes, 
    settings?.detailLevel, 
    settings?.language,
    settings?.mode
  );

  const response = await client.models.generateContent({
    model: modelName,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    }
  });

  const responseText = response.text;
  if (!responseText) throw new Error('Gemini returned empty response');
  
  return JSON.parse(responseText);
}

async function tryOpenAI(text: string, settings?: any) {
  const apiKey = getValidKey(settings?.keys?.openai, process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error('OpenAI Key Missing');

  const prompt = SYSTEM_PROMPT(
    text, 
    settings?.maxNodes, 
    settings?.detailLevel, 
    settings?.language,
    settings?.mode
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${response.status} ${err.error?.message || response.statusText}`);
  }
  const data = (await response.json()) as any;
  return JSON.parse(data.choices[0].message.content);
}

async function tryGroq(text: string, settings?: any) {
  const apiKey = getValidKey(settings?.keys?.groq, process.env.GROQ_API_KEY);
  if (!apiKey) throw new Error('Groq Key Missing');

  const prompt = SYSTEM_PROMPT(
    text, 
    settings?.maxNodes, 
    settings?.detailLevel, 
    settings?.language,
    settings?.mode
  );

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq error: ${response.status} ${err.error?.message || response.statusText}`);
  }
  const data = (await response.json()) as any;
  return JSON.parse(data.choices[0].message.content);
}

async function tryLLMAPI(text: string, settings?: any) {
  const apiKey = process.env.LLMAPI_KEY;
  if (!apiKey) throw new Error('LLMAPI Key Missing');

  const prompt = SYSTEM_PROMPT(
    text, 
    settings?.maxNodes, 
    settings?.detailLevel, 
    settings?.language,
    settings?.mode
  );

  const response = await fetch('https://api.llmapi.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });
  if (!response.ok) throw new Error(`LLMAPI error: ${response.statusText}`);
  const data = (await response.json()) as any;
  return JSON.parse(data.choices[0].message.content);
}

async function tryAki(text: string, settings?: any) {
  const apiKey = process.env.AKI_KEY;
  if (!apiKey) throw new Error('Aki Key Missing');

  const prompt = SYSTEM_PROMPT(
    text, 
    settings?.maxNodes, 
    settings?.detailLevel, 
    settings?.language,
    settings?.mode
  );

  const response = await fetch('https://aki.io/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`Aki error: ${response.statusText}`);
  const data = (await response.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  return JSON.parse(content.includes('```json') ? content.replace(/```json\n?/, '').replace(/```\n?/, '').trim() : content);
}

function getGeminiClient(settings?: any) {
  const apiKey = getValidKey(settings?.keys?.gemini, process.env.GEMINI_API_KEY);
  if (!apiKey) throw new Error('Gemini Key Missing');
  return (apiKey !== process.env.GEMINI_API_KEY) 
    ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) 
    : ai;
}

app.post('/api/gemini-summarize', apiLimiter, authenticateUser, async (req, res) => {
  try {
    const { graphData, settings } = req.body;
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return res.status(400).json({ error: 'Graph data is empty' });
    }
    const client = getGeminiClient(settings);
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are a professional story analyst and knowledge designer. Analyze this knowledge graph structure:
${JSON.stringify(graphData, null, 2)}

Provide a concise, 2-paragraph narrative summary of this entire graph. Focus on the core nodes, central conflicts/connections, and key locations/events. Limit response to under 150 words.`,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Operation failed' });
  }
});

app.post('/api/gemini-what-if', apiLimiter, authenticateUser, async (req, res) => {
  try {
    const { graphData, nodeId, settings } = req.body;
    if (!graphData || !nodeId) {
      return res.status(400).json({ error: 'Graph data and nodeId are required' });
    }
    const node = graphData.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return res.status(400).json({ error: 'Node not found in graph' });
    }
    const client = getGeminiClient(settings);
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are a creative writer and scenario writer. Analyze this knowledge graph:
${JSON.stringify(graphData, null, 2)}

"WHAT IF" Scenario: The entity/character "${node.label}" (Type: ${node.type}, Description: ${node.description || 'N/A'}) was completely removed, died, or disappeared from this lore.

Explain in 2-3 short bullet points how this would restructure the narrative, which other entities/characters would be most affected (by connections), and what new conflicts would emerge. Keep it extremely punchy and narrative-driven.`,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Operation failed' });
  }
});

app.post('/api/gemini-detect-inconsistency', apiLimiter, authenticateUser, async (req, res) => {
  try {
    const { graphData, settings } = req.body;
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return res.status(400).json({ error: 'Graph data is empty' });
    }
    const client = getGeminiClient(settings);
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert editor, detective, and logic controller. Analyze this knowledge graph:
${JSON.stringify(graphData, null, 2)}

Detect logical contradictions, timing gaps, timeline errors, or contradictory descriptions across nodes and links.
List 2-3 logical issues with concise suggestions to fix them. If the graph is fully logically sound with no conflicts, output a short sentence stating that the knowledge structure flows beautifully.`,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Operation failed' });
  }
});

app.post('/api/gemini-auto-complete', apiLimiter, authenticateUser, async (req, res) => {
  try {
    const { graphData, settings } = req.body;
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return res.status(400).json({ error: 'Graph data is empty' });
    }
    const client = getGeminiClient(settings);
    
    const allowedTypes = [
      'person', 'location', 'event', 'object', 'concept', 'other', 
      'organization', 'species', 'artifact', 'technology', 'theme', 
      'process', 'goal', 'evidence', 'timeline', 'faction', 
      'data', 'law', 'myth', 'theory', 'role'
    ];

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are a creative narrative assistant. We have a partially completed knowledge graph:
${JSON.stringify(graphData, null, 2)}

Extend this graph by generating exactly 2 NEW additional nodes and 2-3 NEW links connecting them to each other and/or existing nodes.

Guidelines:
- Do NOT repeat existing node IDs.
- Ensure all source/target link IDs exist either in original or new nodes.
- Use active-voice labels.
- Type of new nodes must be one of: ${allowedTypes.join(', ')}

Return ONLY a valid JSON object matching this structure:
{
  "nodes": [
    { "id": "unique_id_1", "label": "Label name", "type": "type_from_list", "description": "1 sentence description" }
  ],
  "links": [
    { "source": "existing_or_new_id", "target": "existing_or_new_id", "label": "connection label" }
  ]
}`,
      config: {
        responseMimeType: "application/json",
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Operation failed' });
  }
});

app.post('/api/extract-graph', apiLimiter, authenticateUser, async (req, res) => {
  try {
    const validation = extractSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0].message });
    }

    const { text, settings } = validation.data;
    const uid = (req as any).user.uid;
    console.log(`[${new Date().toISOString()}] Initiating extraction for UID: ${uid}. Text length: ${text.length}`);

    let graphData;
    const primaryProvider = settings?.provider || 'gemini';
    const candidates = [primaryProvider, 'gemini', 'gemini-1.5', 'groq', 'openai', 'llmapi', 'aki'];
    // Remove duplicates while preserving order
    const uniqueCandidates = [...new Set(candidates)];
    
    let lastError: any = null;
    let primaryError: any = null;
    let successfulProvider = '';

    for (const cand of uniqueCandidates) {
      // Pre-check key availability to skip unconfigured candidates and avoid error clutter
      if (cand === 'gemini' || cand === 'gemini-1.5') {
        const key = getValidKey(settings?.keys?.gemini, process.env.GEMINI_API_KEY);
        if (!key) {
          console.log(`Skipping cand ${cand}: Gemini API key not provided`);
          continue;
        }
      } else if (cand === 'openai') {
        const key = getValidKey(settings?.keys?.openai, process.env.OPENAI_API_KEY);
        if (!key) {
          console.log(`Skipping cand ${cand}: OpenAI API key not provided`);
          continue;
        }
      } else if (cand === 'groq') {
        const key = getValidKey(settings?.keys?.groq, process.env.GROQ_API_KEY);
        if (!key) {
          console.log(`Skipping cand ${cand}: Groq API key not provided`);
          continue;
        }
      } else if (cand === 'llmapi') {
        if (!process.env.LLMAPI_KEY) {
          console.log(`Skipping cand ${cand}: LLMAPI_KEY not provided`);
          continue;
        }
      } else if (cand === 'aki') {
        if (!process.env.AKI_KEY) {
          console.log(`Skipping cand ${cand}: AKI_KEY not provided`);
          continue;
        }
      }

      try {
        console.log(`Attempting extraction with provider: ${cand}`);
        if (cand === 'gemini') {
          graphData = await tryGemini(text, settings, "gemini-3.5-flash");
        } else if (cand === 'gemini-1.5') {
          graphData = await tryGemini(text, settings, "gemini-flash-latest");
        } else if (cand === 'openai') {
          graphData = await tryOpenAI(text, settings);
        } else if (cand === 'groq') {
          graphData = await tryGroq(text, settings);
        } else if (cand === 'llmapi') {
          graphData = await tryLLMAPI(text, settings);
        } else if (cand === 'aki') {
          graphData = await tryAki(text, settings);
        } else {
          continue;
        }

        if (graphData && graphData.nodes && graphData.nodes.length > 0) {
          successfulProvider = cand;
          break;
        }
      } catch (err: any) {
        if (cand === primaryProvider) {
          primaryError = err;
        }
        lastError = err;
        console.warn(`Provider ${cand} failed:`, err.message);
        // Continue to next candidate
      }
    }

    if (!graphData) {
      console.error('All extraction candidates failed.');
      const activeError = primaryError || lastError;
      const errorMessage = activeError?.message || 'All neural links exhausted.';
      const isQuotaError = errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
      
      throw new Error(isQuotaError 
        ? `Neural bandwidth exceeded (Quota Error). Please try again in 60 seconds or switch providers in System Core.`
        : `Neural link unstable: ${errorMessage}`
      );
    }

    console.log(`Extraction successful using ${successfulProvider}`);
    res.json(graphData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process signal. Neural link unstable.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
