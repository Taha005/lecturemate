import { LectureData } from '../types';

export const process_youtube_url = async (url: string): Promise<LectureData> => {
  const response = await fetch('/api/process-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to process YouTube URL");
  }

  return response.json();
};

export const askDoubt = async (transcript: string, question: string): Promise<string> => {
  const response = await fetch('/api/ask-doubt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, question })
  });

  if (!response.ok) return "Error connecting to server.";
  
  const data = await response.json();
  return data.answer;
};

export const askLectureDoubt = async (transcript: string, chapters: any[], question: string): Promise<string> => {
  return askDoubt(transcript, question);
};

export const explainLikeIm5 = async (selectedText: string, fullTranscriptContext: string): Promise<string> => {
  const response = await fetch('/api/explain-like-im-5', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedText, fullTranscriptContext })
  });

  if (!response.ok) return "Could not generate explanation.";
  
  const data = await response.json();
  return data.explanation;
};

export const generateSpeech = async (text: string): Promise<string> => {
  const response = await fetch('/api/generate-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) throw new Error("Failed to generate speech");
  
  const data = await response.json();
  return data.audioData;
};

export const evaluateExplanation = async (topic: string, userExplanation: string, transcript: string): Promise<any> => {
  const response = await fetch('/api/evaluate-explanation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, userExplanation, transcript })
  });

  if (!response.ok) throw new Error("Failed to evaluate explanation");
  
  return response.json();
};