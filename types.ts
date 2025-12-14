export interface Chapter {
  title: string;
  start: string;
  end: string;
  notes?: string[];
  timestamp?: string;
}

export interface ExamNoteSection {
  chapterTitle: string;
  points: string[];
}

export interface Formula {
  equation: string; // LaTeX format ideal
  context: string;
  explanation?: string;
  formula?: string;
}

export interface PracticeQuestion {
  question: string;
  answer: string;
  type?: string;
  options?: string[];
}

export interface ConfidenceQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface MindMapNode {
  title: string;
  children?: MindMapNode[];
}

export interface LectureData {
  id: string;   // Unique ID for persistence
  date: string; // ISO Date string
  videoUrl: string; // Added to support embedded player
  videoTitle: string;
  transcript: string; // The SINGLE SOURCE OF TRUTH
  chapters: Chapter[];
  examNotes: ExamNoteSection[];
  formulas: Formula[];
  
  // Extended fields for Revision tools
  topicName: string;
  difficulty: string;
  practiceQuestions: PracticeQuestion[];
  quickRevision: string[];
  revisionSheet: string;
  mindMap: MindMapNode;
  examQuestions: string[];
  confidenceQuestions: ConfidenceQuestion[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface InputState {
  text: string;
  images: File[];
  youtubeLink: string;
}

// Lecture Pilot Specific Types
export interface LecturePilotData {
  chapters: { title: string; timestamp: string; notes: string[] }[];
  cleaned_transcript: string;
}

export interface LecturePilotPhase02Data {
  eli5_explanations: { chapter_title: string; simple_explanation: string }[];
  formulas: { formula: string; explanation: string }[];
  doubt_responses: { question: string; answer: string }[];
}

export interface LecturePilotPhase03Data {
  revision_sheet: string[];
  exam_questions: {
    mcqs: { question: string; options: string[]; correct_answer: string }[];
    short_answers: { question: string; answer: string }[];
    long_answers: { question: string; answer_outline: string[] }[];
  };
  confusion_clarifications: { confusing_point: string; clarification: string }[];
}
