import express from 'express';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Gemini Client
// API Key is strictly server-side now
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- API Endpoints ---

app.post('/api/process-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const systemInstruction = `
You are the "Lecture Analyzer and Revision Dashboard" AI.
Your absolute and non-negotiable directive is to use the content found via Google Search for the provided YouTube link as the SINGLE SOURCE OF TRUTH.

**I. Input & Core Processing**
1. Access the provided YouTube URL using Google Search to find its transcript, notes, or detailed summary.
2. Generate a "transcript" field which is the text representation of the video. This is the ONLY permissible source for subsequent outputs.
3. Constraint: NEVER use outside knowledge. NEVER add concepts not present in the video data found.

**II. Structured Output Generation**
From the transcript/data found, generate a JSON object containing:
1. **Lecture Segmentation**: Divide into chapters with Title, Start Timestamp (MM:SS), and End Timestamp (MM:SS).
2. **Exam Notes**: Concise, exam-oriented bullet points structured by chapter.
3. **Formula Extraction**: Identify **all** mathematical, physical, or chemical formulas. 
   - **CRITICAL FORMATTING RULE**: You MUST output formulas in **valid LaTeX format enclosed in double dollar signs** (e.g., $$E = mc^2$$ or $$v = \\frac{d}{t}$$). 
   - DO NOT output plain text formulas (like "F = ma").
   - Provide a concise "context" explanation for each formula derived strictly from the transcript.
4. **Revision Tools**: Generate practice questions, quick revision points, a markdown revision sheet, a simple mind map structure, exam questions, and confidence check questions.

**III. STRICT JSON OUTPUT FORMAT**
You must output strictly valid JSON code. 
- Do not use Markdown formatting (no \`\`\`json blocks).
- Do not include any introductory or concluding text.
- The output must start with '{' and end with '}'.
The JSON must match this structure:
{
  "videoTitle": "string",
  "transcript": "string (The comprehensive text representation of the video)",
  "topicName": "string",
  "difficulty": "Easy" | "Medium" | "Hard",
  "chapters": [ { "title": "string", "start": "string", "end": "string" } ],
  "examNotes": [ { "chapterTitle": "string", "points": ["string"] } ],
  "formulas": [ { "equation": "string (LaTeX with $$ wrapper)", "context": "string" } ],
  "practiceQuestions": [ { "question": "string", "answer": "string", "type": "string", "options": ["string"] } ],
  "quickRevision": ["string"],
  "revisionSheet": "string (markdown)",
  "mindMap": { "title": "string", "children": [ { "title": "string", "children": [...] } ] },
  "examQuestions": ["string"],
  "confidenceQuestions": [ { "question": "string", "options": ["string"], "answer": "string" } ]
}
`;

    const prompt = `
Process this YouTube URL: ${url}

Return ONLY the raw JSON object. Do not wrap it in markdown code blocks. Do not add any conversational text.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction,
      }
    });

    if (response.text) {
      let cleanText = response.text.trim();
      // Cleanup code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Robust JSON extraction
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }

      const data = JSON.parse(cleanText);
      // Inject metadata
      data.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      data.date = new Date().toISOString();
      data.videoUrl = url;

      return res.json(data);
    }
    throw new Error("No text response from model");

  } catch (error) {
    console.error('Process URL Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process URL' });
  }
});

app.post('/api/ask-doubt', async (req, res) => {
  try {
    const { transcript, question } = req.body;
    
    const systemInstruction = `
You are the Doubt Resolution module of the Lecture Analyzer.
**SINGLE SOURCE OF TRUTH**: You must answer ONLY using the provided transcript.
**RULE**: If the topic is not covered in the transcript, you must respond EXACTLY: "This topic was not covered in the lecture."
Do not attempt to be helpful by adding external facts.
`;
    const prompt = `TRANSCRIPT:\n${transcript}\n\nUSER QUESTION:\n${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction }
    });

    res.json({ answer: response.text || "No response generated." });
  } catch (error) {
    res.status(500).json({ error: 'Failed to answer doubt' });
  }
});

app.post('/api/explain-like-im-5', async (req, res) => {
  try {
    const { selectedText, fullTranscriptContext } = req.body;

    const systemInstruction = `
You are the "Explain Like I'm 5" (ELI5) module.
Your task is to rephrase the selected text for a 5-year-old child.
**INSTRUCTIONS**:
1. Use extremely simple vocabulary (kindergarten level).
2. Use short, cheerful, declarative sentences.
3. Use relatable, everyday analogies (e.g., toys, playground, animals, food).
4. **CRITICAL CONSTRAINT**: You must derive ALL concepts and analogies ONLY from the provided transcript.
5. **ZERO EXTERNAL KNOWLEDGE**: Do not introduce new facts. If the transcript doesn't explain how a car works, do not explain how a car works using outside knowledge. Stick STRICTLY to the text provided.
`;

    const prompt = `FULL CONTEXT (for reference only):\n${fullTranscriptContext}\n\nSELECTED TEXT TO EXPLAIN:\n"${selectedText}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction }
    });

    res.json({ explanation: response.text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate ELI5' });
  }
});

app.post('/api/generate-speech', async (req, res) => {
  try {
    const { text } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    res.json({ audioData: base64Audio });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

app.post('/api/evaluate-explanation', async (req, res) => {
  try {
    const { topic, userExplanation } = req.body;
    
    const systemInstruction = `
You are a tutor evaluating a student's explanation of a concept.
Grade their explanation on accuracy and completeness based on the topic provided.
Return a JSON object with:
- score (0-100)
- feedback (constructive criticism)
- missingPoints (array of strings, concepts they missed)
- correction (a better way to explain it)
`;
    const prompt = `TOPIC: ${topic}\nSTUDENT EXPLANATION: ${userExplanation}`;

    // Schema not strictly required on backend if we parse JSON manually, 
    // but good for reliability.
    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.INTEGER },
        feedback: { type: Type.STRING },
        missingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        correction: { type: Type.STRING }
      },
      required: ["score", "feedback", "missingPoints", "correction"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: evaluationSchema
      }
    });

    let result = {};
    if (response.text) {
      const cleaned = response.text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      result = JSON.parse(cleaned);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate' });
  }
});

// --- Serving Frontend ---
// In production, files are usually in 'dist' or 'build'
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});