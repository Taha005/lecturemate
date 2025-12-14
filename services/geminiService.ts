import { GoogleGenAI, Modality, Type } from "@google/genai";
import { YoutubeTranscript } from 'youtube-transcript';
import { LectureData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SYSTEM_INSTRUCTION = `
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
1. **Lecture Segmentation**: Divide into chapters with Title, Start Timestamp (MM:SS), and End Timestamp (MM:SS).
2. **Exam Notes**: Concise, exam-oriented bullet points structured by chapter.
3. **Formula Extraction**: Identify **all** mathematical, physical, or chemical formulas. 
   - **CRITICAL FORMATTING RULE**: You MUST output formulas in **valid LaTeX format enclosed in double dollar signs** (e.g., $$E = mc^2$$). 
   - DO NOT output plain text formulas.
   - Provide a concise "context" explanation for each formula derived strictly from the transcript.
4. **Revision Tools**: Generate practice questions, quick revision points, a markdown revision sheet, a simple mind map structure, exam questions, and confidence check questions.

**IV. STRICT JSON OUTPUT FORMAT**
You must output strictly valid JSON code. 
- The output must start with '{' and end with '}'.
The JSON must match this structure:
{
  "videoTitle": "string (Extract meaningful title from context or use 'Lecture Analysis')",
  "transcript": "string (Return the full transcript text provided)",
  "topicName": "string",
  "difficulty": "Easy" | "Medium" | "Hard",
  "chapters": [ { "title": "string", "start": "string", "end": "string" } ],
  "examNotes": [ { "chapterTitle": "string", "points": ["string"] } ],
  "formulas": [ { "equation": "string", "context": "string" } ],
  "practiceQuestions": [ { "question": "string", "answer": "string", "type": "string", "options": ["string"] } ],
  "quickRevision": ["string"],
  "revisionSheet": "string",
  "mindMap": { "title": "string", "children": [ { "title": "string", "children": [...] } ] },
  "examQuestions": ["string"],
  "confidenceQuestions": [ { "question": "string", "options": ["string"], "answer": "string" } ]
}
`;

export const process_youtube_url = async (url: string): Promise<LectureData> => {
  // 1. Extract Video ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  
  if (!videoId) throw new Error("Invalid YouTube URL");

  // 2. Fetch Transcript
  let transcriptText = "";
  try {
    // Note: Client-side fetching might be blocked by CORS depending on the environment.
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcriptItems || transcriptItems.length === 0) throw new Error("Empty transcript");
    transcriptText = transcriptItems.map(item => item.text).join(' ');
  } catch (error: any) {
    console.error("Transcript Error:", error);
    throw new Error("Could not fetch transcript. Since we are running frontend-only, this is likely due to CORS restrictions on the YouTube API in the browser. Try using a CORS extension or a proxy if available.");
  }

  // 3. Gemini Generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ parts: [{ text: `TRANSCRIPT START:\n${transcriptText}\nTRANSCRIPT END\n\nGenerate JSON dashboard.` }] }],
    config: {
      systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    }
  });

  if (!response.text) throw new Error("AI generated empty response");

  let cleanText = response.text.trim();
  // Strip markdown code blocks if present
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  let data;
  try {
    data = JSON.parse(cleanText);
  } catch (e) {
    throw new Error("Failed to parse AI response as JSON");
  }
  
  // Inject Client-Side Metadata
  data.id = crypto.randomUUID();
  data.date = new Date().toISOString();
  data.videoUrl = url;
  data.transcript = transcriptText;

  return data;
};

export const askDoubt = async (transcript: string, question: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: `TRANSCRIPT:\n${transcript}\n\nUSER QUESTION:\n${question}` }] }],
            config: {
                systemInstruction: `You are a Doubt Resolver. Answer ONLY using the provided transcript. If not found, say "Not covered in lecture."`
            }
        });
        return response.text || "No response.";
    } catch (e) {
        console.error(e);
        return "Error resolving doubt.";
    }
};

export const askLectureDoubt = async (transcript: string, chapters: any[], question: string): Promise<string> => {
  return askDoubt(transcript, question);
};

export const explainLikeIm5 = async (selectedText: string, fullTranscriptContext: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: `FULL CONTEXT:\n${fullTranscriptContext}\n\nSELECTED TEXT TO EXPLAIN:\n"${selectedText}"` }] }],
            config: { 
                systemInstruction: `You are the "Explain Like I'm 5" module. Rephrase the selected text for a 5-year-old using simple analogies derived ONLY from the context.` 
            }
        });
        return response.text || "Could not generate explanation.";
    } catch (e) {
        console.error(e);
        return "Error explaining text.";
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
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
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio generated");
    return audioData;
};

export const evaluateExplanation = async (topic: string, userExplanation: string, transcript: string): Promise<any> => {
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
    contents: [{ parts: [{ text: `TRANSCRIPT: ${transcript}\nTOPIC: ${topic}\nSTUDENT EXPLANATION: ${userExplanation}` }] }],
    config: {
      systemInstruction: `You are a tutor. Grade the explanation 0-100 based STRICTLY on the transcript.`,
      responseMimeType: "application/json",
      responseSchema: evaluationSchema
    }
  });

  let result = {};
  if (response.text) {
      const cleaned = response.text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      result = JSON.parse(cleaned);
  }
  return result;
};