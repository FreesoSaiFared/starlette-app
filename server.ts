import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('GEMINI_API_KEY is not set in environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// REST Endpoints for Burlesque Audition Visual Novel & Voice
// ----------------------------------------------------

// Helper to call OpenAI-compatible API
async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7
) {
  const url = endpoint.endsWith('/chat/completions')
    ? endpoint
    : endpoint.replace(/\/+$/, '') + '/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const payload = {
    model: model || 'gpt-4o-mini',
    temperature: temperature || 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const json: any = await response.json();
  const rawContent = json.choices?.[0]?.message?.content || '{}';
  return JSON.parse(rawContent);
}

// 0. Test LLM Connection (for OpenAI-compatible or Gemini)
app.post('/api/llm/test-connection', async (req, res) => {
  try {
    const { provider, endpoint, apiKey, model } = req.body;
    if (provider === 'openai-compatible') {
      if (!endpoint) {
        return res.status(400).json({ success: false, error: 'Endpoint URL is required' });
      }
      const testResult = await callOpenAICompatible(
        endpoint,
        apiKey,
        model,
        'You are a testing assistant. Return a JSON object with {"status": "ok", "message": "Connected successfully"}',
        'Ping',
        0.5
      );
      return res.json({ success: true, message: testResult.message || 'Connected to external LLM!' });
    } else {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: 'Ping test. Reply with: Gemini Connected.',
      });
      return res.json({ success: true, message: response.text || 'Gemini Connected.' });
    }
  } catch (err: any) {
    console.error('LLM Test Connection error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Connection failed' });
  }
});

// 1. Audition Chat with Personality, Dynamic Storyline & Voice Routing
app.post('/api/audition/chat', async (req, res) => {
  try {
    const { candidate, history, userMessage, llmConfig } = req.body;

    const customStoryline = candidate.customStorylinePrompt || llmConfig?.customStorylinePrompt || '';

    const systemPrompt = `You are playing ${candidate.name} ("${candidate.stageName}"), a prospective burlesque dancer auditioning to join a high-class Parisian Cabaret ("The Aurelian Starlet").
Character Profile:
- Title: ${candidate.title}
- Background: ${candidate.bio}
- Personality: ${candidate.personality}
- Voice style & Intonation: ${candidate.voiceStyle}
- Specialty: ${candidate.specialty}
${customStoryline ? `- Cabaret Storyline & Setting Directives: ${customStoryline}` : ''}

You are in a private audition salon talking with the Cabaret Director.
Be deeply in-character: charming, theatrical, sharp-witted, slightly dramatic, alluring, and authentic to 1920s Parisian burlesque haute society.
Respond to the Director's query.

You must return valid JSON matching this schema:
{
  "reply": "Your in-character spoken dialogue line (1-3 sentences, natural for spoken voice)",
  "emotion": "one of: neutral | flirty | amused | dramatic | impressed | thoughtful",
  "chemistryDelta": number between -5 and +15 reflecting how well the director's comment resonated,
  "stageDirection": "Short visual novel action in brackets (e.g. *adjusts her silk gloves with a subtle smirk*)",
  "suggestedOptions": [
    "Option 1: Director's follow-up choice A",
    "Option 2: Director's follow-up choice B",
    "Option 3: Director's follow-up choice C"
  ]
}`;

    const userPrompt = `Conversation so far:\n${JSON.stringify(history || [])}\n\nDirector just asked/said: "${userMessage}"\n\nGive your in-character audition response as JSON.`;

    let parsed: any = null;

    if (llmConfig && llmConfig.provider === 'openai-compatible' && llmConfig.endpoint) {
      // Route via OpenAI-compatible endpoint
      parsed = await callOpenAICompatible(
        llmConfig.endpoint,
        llmConfig.apiKey,
        llmConfig.model,
        systemPrompt,
        userPrompt,
        llmConfig.temperature || 0.7
      );
    } else {
      // Default to Gemini API
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              emotion: {
                type: Type.STRING,
                enum: ['neutral', 'flirty', 'amused', 'dramatic', 'impressed', 'thoughtful'],
              },
              chemistryDelta: { type: Type.NUMBER },
              stageDirection: { type: Type.STRING },
              suggestedOptions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['reply', 'emotion', 'chemistryDelta', 'stageDirection', 'suggestedOptions'],
          },
        },
      });

      parsed = JSON.parse(response.text || '{}');
    }

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Error in audition chat:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate dialogue',
      fallback: {
        reply: "Ah, mon cher Directeur, the stage is my sanctuary. Give me the spotlight, and I shall make the audience weep with ecstasy.",
        emotion: 'flirty',
        chemistryDelta: 5,
        stageDirection: '*takes a slow sip of champagne with an enigmatic gaze*',
        suggestedOptions: [
          'Show me your signature solo routine.',
          'What makes you stand out from the other starlets?',
          'The salary is demanding, but the glory is unmatched.',
        ],
      },
    });
  }
});

// 2. High-Fidelity Female Character TTS Voice Generation
app.post('/api/audition/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore', voiceStyle = 'alluring Parisian burlesque dancer' } = req.body;
    const ai = getAI();

    const voicePrompt = `Say with ${voiceStyle}: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: voicePrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || 'Kore',
            },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
      throw new Error('No audio returned from Gemini TTS');
    }

    res.json({ success: true, audioBase64 });
  } catch (err: any) {
    console.error('Error generating audition TTS:', err);
    res.status(500).json({ success: false, error: err?.message || 'TTS generation failed' });
  }
});

// 3. Audition Solo Performance Evaluation
app.post('/api/audition/solo-performance', async (req, res) => {
  const candidate = req.body?.candidate || { name: 'The starlet', stageName: 'Starlet', specialty: 'Cancan' };
  try {
    const ai = getAI();

    const prompt = `Describe a 3-sentence breathtaking live audition improvisation by ${candidate.name} ("${candidate.stageName}") demonstrating her specialty "${candidate.specialty}".
Include theatrical visual novel atmosphere, her movement grace, and her closing quote to the Director.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are the artistic narrator of a high-class cabaret visual novel.',
      },
    });

    res.json({ success: true, narration: response.text });
  } catch (err: any) {
    console.error('Error generating solo audition performance:', err);
    res.status(500).json({
      success: true,
      narration: `${candidate.name} takes center floor beneath the warm amber chandelier, executing a mesmerizing routine with peerless Parisian poise and dazzling applause.`,
    });
  }
});

// ----------------------------------------------------
// WebSocket Live Interactive Audition Voice Stream
// ----------------------------------------------------
const wss = new WebSocketServer({ server, path: '/api/live-audition' });

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected to Live Audition WebSocket');

  ws.on('message', async (data: Buffer) => {
    try {
      const parsed = JSON.parse(data.toString());

      // If client requests a quick live voice synthesis or live audio packet
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      // Ignore malformed payloads
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from Live Audition WebSocket');
  });
});

// ----------------------------------------------------
// Vite & Static Asset Handling
// ----------------------------------------------------
async function setupViteMiddleware() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`The Starlet Cabaret Server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteMiddleware();
