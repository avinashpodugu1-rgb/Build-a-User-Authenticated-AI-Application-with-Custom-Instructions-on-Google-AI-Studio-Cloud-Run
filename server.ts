import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Standard Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy-initialized Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment. Gemini features will return a graceful configuration notice.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Standard Helper: executes generateContent with an automated fallback ladder
 * across resilient models and recoverable status codes.
 */
async function generateContentWithFallback(contents: any, systemInstruction?: string): Promise<FallbackResult> {
  const ai = getGeminiClient();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in your environment or Settings > Secrets.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: systemInstruction
          ? {
              systemInstruction,
            }
          : undefined,
      });

      const text = response.text || '';
      return { text, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const message = err?.message || String(err);
      console.warn(`[Gemini Fallback] Model ${model} encountered error (${status}): ${message}. Attempting next model...`);

      // Recoverable error conditions: 503, 429, 404, 500, or model-specific failure
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        message.includes('ResourceExhausted') ||
        message.includes('Unavailable') ||
        message.includes('not found');

      if (!isRecoverable && MODEL_FALLBACK_LADDER.indexOf(model) === MODEL_FALLBACK_LADDER.length - 1) {
        break;
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Health Check Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Gemini Reflection & Conversation Endpoint
app.post('/api/gemini/reflect', async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'deep_reflection';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt) {
      res.status(400).json({ error: 'Prompt cannot be empty.' });
      return;
    }

    if (prompt.length > 10000) {
      res.status(400).json({ error: 'Prompt exceeds maximum character limit of 10,000 characters.' });
      return;
    }

    // Role-tailored system instructions
    let systemInstruction = 'You are a warm, supportive, and perceptive reflection partner.';
    if (mode === 'deep_reflection') {
      systemInstruction =
        'You are an empathetic, insightful journaling companion. Guide the user through deep self-reflection, helping them untangle thoughts, acknowledge feelings, and spot cognitive patterns with compassion, wisdom, and clarity.';
    } else if (mode === 'brainstorm') {
      systemInstruction =
        'You are an energetic, creative brainstorming partner. Offer diverse perspectives, novel angles, structured frameworks, and imaginative possibilities based on the user\'s entry.';
    } else if (mode === 'summary') {
      systemInstruction =
        'You are an expert synthesizer. Provide: 1) Core Summary (2-3 sentences), 2) Key Themes & Insights (bulleted), and 3) Actionable Next Steps or Questions to consider.';
    } else if (mode === 'inquiry') {
      systemInstruction =
        'You are a Socratic guide. Offer thoughtful, clarifying observations and ask 2-3 deep, open-ended questions designed to unlock deeper self-discovery.';
    }

    // Prepare contents: multi-turn history + latest prompt
    const contents: any[] = [];

    // Sanitize and append prior turns if provided (max last 10 turns for context safety)
    const recentHistory = history.slice(-10);
    for (const turn of recentHistory) {
      if (turn && typeof turn.text === 'string' && (turn.role === 'user' || turn.role === 'model')) {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.text.slice(0, 4000) }],
        });
      }
    }

    // Append current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const result = await generateContentWithFallback(contents, systemInstruction);

    // Generate a quick concise 1-sentence insight for entry indexing
    let summary = '';
    try {
      const summaryPrompt = `Based on this reflection interaction, produce a single concise takeaway sentence (max 25 words) summarizing the core theme:\n\nUser: ${prompt.slice(0, 800)}\nAI: ${result.text.slice(0, 800)}`;
      const summaryResult = await generateContentWithFallback(summaryPrompt, 'You generate concise, 1-sentence takeaways.');
      summary = summaryResult.text.trim();
    } catch {
      summary = prompt.slice(0, 100) + '...';
    }

    res.json({
      response: result.text,
      summary,
      modelUsed: result.modelUsed,
      mode,
    });
  } catch (err: any) {
    console.error('Error handling /api/gemini/reflect:', err);
    res.status(500).json({
      error: err?.message || 'Failed to generate reflection with Gemini API.',
    });
  }
});

// Vite Middleware & Static Serving Setup
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
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
