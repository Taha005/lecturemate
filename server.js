import express from 'express';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { YoutubeTranscript } from 'youtube-transcript';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Initialize Gemini Client
// Using the provided API key as fallback if environment variable is not set
const apiKey = process.env.API_KEY || "AIzaSyCkaLxPMjY4Ry7OA2m0UCoAeih70ynriG8";
const ai = new GoogleGenAI({ apiKey: apiKey });

// --- Helper Functions ---

const extractVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- API Endpoints ---

app.post('/api/process-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log(`[Backend] Processing URL: ${url}`);

    // 1. Extract Video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      console.error(`[Backend] Invalid YouTube URL provided: ${url}`);
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // 2. Fetch Transcript (Single Source of Truth)
    let transcriptText = "";
    try {
      console.log(`[Backend] Fetching transcript for ID: ${videoId}`);
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptItems || transcriptItems.length === 0) {
         throw new Error("Empty transcript");
      }
      
      // Concatenate all text parts
      transcriptText = transcriptItems.map(item => item.text).join(' ');
      console.log(`[Backend] Transcript fetched successfully. Length: ${transcriptText.length} chars`);

    } catch (transcriptError) {
      console.error(`[Backend] Transcript fetch failed: ${transcriptError.message}`);
      // Return the specific error message requested
      return res.status(422).json({ error: "This video has no accessible transcript. We avoid hallucinations." });
    }

    // 3. Send Transcript to Gemini
    // Strict system instruction: ONLY use the provided text.
    const systemInstruction = `
You are the "Lecture Analyzer and Revision Dashboard" AI.
Your absolute and non-negotiable directive is to use the PROVIDED TRANSCRIPT TEXT as the SINGLE SOURCE OF TRUTH.

**I. Input**
You will receive the raw text transcript of a lecture.

**II. Strict Constraints**
- NEVER access the internet or external tools.
- NEVER use outside knowledge. 
- NEVER add concepts not present in the transcript.
- If the transcript is incomplete or unclear, strictly state what is missing based ONLY on the text provided.

**III. Structured Output Generation**
Generate a JSON object containing:
1. **Lecture Segmentation**: Divide into chapters with Title, Start Timestamp (MM:SS), and End Timestamp (MM:SS). NB: Since you only have text, estimate timestamps based on logical flow if exact times are lost, or leave as "00:00" if purely text-based.
2. **Exam Notes**: Concise, exam-oriented bullet points structured by chapter.
3. **Formula Extraction**: Identify **all** mathematical, physical, or chemical formulas. 
   - **CRITICAL FORMATTING RULE**: You MUST output formulas in **valid LaTeX format enclosed in double dollar signs** (e.g., $$E = mc^2$$ or $$v = \\frac{d}{t}$$). 
   - DO NOT output plain text formulas (like "F = ma").
   - Provide a concise "context" explanation for each formula derived strictly from the transcript.
4. **Revision Tools**: Generate practice questions, quick revision points, a markdown revision sheet, a simple mind map structure, exam questions, and confidence check questions.

**IV. STRICT JSON OUTPUT FORMAT**
You must output strictly valid JSON code. 
- Do not use Markdown formatting (no \`\`\`json blocks).
- Do not include any introductory or concluding text.
- The output must start with '{' and end with '}'.
The JSON must match this structure:
{
  "videoTitle": "string (Extract meaningful title from context or use 'Lecture Analysis')",
  "transcript": "string (Return the full transcript text provided)",
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
TRANSCRIPT DATA START:
${transcriptText}
TRANSCRIPT DATA END.

Generate the JSON dashboard based ONLY on the transcript above.
`;

    console.log(`[Backend] Sending ${transcriptText.length} chars to Gemini...`);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        // NO TOOLS - We provide the data directly
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      let cleanText = response.text.trim();
      // Cleanup code blocks if present (extra safety)
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const data = JSON.parse(cleanText);
      
      // Inject metadata
      data.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      data.date = new Date().toISOString();
      data.videoUrl = url;
      // Ensure transcript is passed back exactly as used
      data.transcript = transcriptText;

      console.log(`[Backend] Successfully generated analysis for: ${data.topicName}`);
      return res.json(data);
    }
    
    throw new Error("No text response from Gemini");

  } catch (error) {
    console.error('[Backend] Process URL Error:', error);
    // Determine status code based on error type
    const status = error.message.includes('accessible transcript') ? 422 : 500;
    res.status(status).json({ error: error.message || 'Failed to process URL' });
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

**STRICT CONSTRAINT**:
You MUST answer ONLY using the provided lecture transcript.
Do NOT use outside knowledge.
Do NOT add examples that are not explicitly mentioned.
`;
    const prompt = `TRANSCRIPT:\n${transcript}\n\nUSER QUESTION:\n${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { systemInstruction }
    });

    res.json({ answer: response.text || "No response generated." });
  } catch (error) {
    console.error('Ask Doubt Error:', error);
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
    console.error('ELI5 Error:', error);
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
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

app.post('/api/evaluate-explanation', async (req, res) => {
  try {
    const { topic, userExplanation, transcript } = req.body;
    
    const systemInstruction = `
You are a tutor evaluating a student's explanation of a concept.
Grade their explanation on accuracy and completeness based STRICTLY on the lecture transcript provided.

**STRICT CONSTRAINT**:
You MUST answer ONLY using the provided lecture transcript.
Do NOT use outside knowledge.
Do NOT add examples that are not explicitly mentioned.

Return a JSON object with:
- score (0-100)
- feedback (constructive criticism based ONLY on the lecture material)
- missingPoints (array of strings, concepts they missed that WERE in the transcript)
- correction (a better way to explain it using ONLY the transcript info)
`;
    const prompt = `TRANSCRIPT: ${transcript}\nTOPIC: ${topic}\nSTUDENT EXPLANATION: ${userExplanation}`;

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
    console.error('Evaluate Error:', error);
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