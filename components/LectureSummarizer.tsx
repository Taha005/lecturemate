import React, { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, FileText, ChevronRight, PlayCircle, PauseCircle, Clock, CheckCircle2, FileEdit, Brain, Sigma, MessageSquare, Send, GraduationCap, ListChecks, HelpCircle, Sparkles } from 'lucide-react';
import { InputState, LecturePilotData, LecturePilotPhase02Data, LecturePilotPhase03Data, ProcessingStatus } from '../types';
import { generateSpeech, askLectureDoubt } from '../services/geminiService';

interface LecturePilotProps {
  inputState: InputState;
  setInputState: React.Dispatch<React.SetStateAction<InputState>>;
  onProcess: () => void; // This now triggers full pipeline
  status: ProcessingStatus;
  data: LecturePilotData | null;
  onClear: () => void;
  // Phase 02 Props
  phase02Data: LecturePilotPhase02Data | null;
  phase02Status: ProcessingStatus;
  onRunPhase02: () => void;
  // Phase 03 Props
  phase03Data: LecturePilotPhase03Data | null;
  phase03Status: ProcessingStatus;
  onRunPhase03: () => void;
}

export const LectureSummarizer: React.FC<LecturePilotProps> = ({
  inputState,
  setInputState,
  onProcess,
  status,
  data,
  onClear,
  phase02Data,
  phase02Status,
  onRunPhase02,
  phase03Data,
  phase03Status,
  onRunPhase03
}) => {
  const [activeView, setActiveView] = useState<'chapters' | 'transcript' | 'eli5' | 'formulas' | 'doubts' | 'exam' | 'revision' | 'clarifications'>('chapters');
  const [doubtInput, setDoubtInput] = useState('');
  const [askingDoubt, setAskingDoubt] = useState(false);
  const [localDoubts, setLocalDoubts] = useState<{question: string, answer: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setInputState(prev => ({ ...prev, images: [...prev.images, ...Array.from(e.target.files || [])] }));
    }
  };

  const loadSample = () => {
    setInputState(prev => ({
        ...prev,
        text: `Okay, um, so today we're gonna talk about, uh, the concept of, you know, Machine Learning bias. Basically, it's when an algorithm produces results that are systematically prejudiced due to erroneous assumptions in the machine learning process. Um, think about it like this: if you train a model on historical hiring data, and that data shows, uh, fewer women in tech roles, the model might learn to downgrade resumes from women. That's, that's really bad, right? We call this "Algorithmic Bias". There are a few types. One is "Selection Bias", where the training data isn't representative. Another is "Confirmation Bias".`
    }));
  };

  const handleReadAloud = async (text: string) => {
    if (isPlaying && audioSource) {
      audioSource.stop();
      setIsPlaying(false);
      return;
    }
    try {
      const base64Audio = await generateSpeech(text);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) view[i] = audioData.charCodeAt(i);
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      setAudioSource(source);
      setIsPlaying(true);
    } catch (e) {
      console.error(e);
      alert("Error playing audio");
    }
  };

  const handleAskDoubt = async () => {
    if (!doubtInput.trim() || !data) return;
    setAskingDoubt(true);
    try {
        const answer = await askLectureDoubt(data.cleaned_transcript, data.chapters, doubtInput);
        setLocalDoubts(prev => [...prev, { question: doubtInput, answer }]);
        setDoubtInput('');
    } catch (e) {
        alert("Failed to get answer");
    }
    setAskingDoubt(false);
  };

  const allDoubts = [...(phase02Data?.doubt_responses || []), ...localDoubts];

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 overflow-hidden">
      {/* LEFT PANEL - INPUT */}
      <div className="w-full lg:w-5/12 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-full">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide text-xs">
                <FileText className="w-4 h-4 text-brand-600"/> Pilot Console
            </h2>
            {data && <button onClick={onClear} className="text-xs text-red-500 hover:text-red-700 font-medium">Reset System</button>}
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <textarea
                className="w-full h-[60%] p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 text-sm font-mono leading-relaxed resize-none"
                placeholder="<<< PASTE TRANSCRIPT HERE >>>"
                value={inputState.text}
                onChange={(e) => setInputState(prev => ({ ...prev, text: e.target.value }))}
                disabled={!!data}
            />
            
            {!data && (
                <>
                <div className="flex gap-2">
                    <button onClick={loadSample} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-gray-600 font-medium">
                        Load Sample Transcript
                    </button>
                    <button onClick={() => setInputState({text: '', images: [], youtubeLink: ''})} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-gray-600">
                        Clear
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-gray-300 rounded-lg p-3 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                     >
                        <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1"/>
                        <span className="text-xs text-gray-500 font-medium">Add Slides (Optional)</span>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*"/>
                     </div>

                     <div className="border border-gray-200 rounded-lg p-3 flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Video Link..." 
                                className="flex-1 text-xs outline-none bg-transparent"
                                value={inputState.youtubeLink}
                                onChange={(e) => setInputState(prev => ({...prev, youtubeLink: e.target.value}))}
                            />
                        </div>
                     </div>
                </div>
                
                {inputState.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {inputState.images.map((img, i) => (
                            <div key={i} className="w-10 h-10 rounded overflow-hidden border">
                                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
                </>
            )}

            {/* PHASE CONTROL PANEL */}
            {data && (
                <div className="space-y-3">
                    {/* PHASE 01 STATUS */}
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-green-600"/>
                             <span className="text-sm font-medium text-green-900">Phase 01: Structure</span>
                        </div>
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>
                    </div>

                    {/* PHASE 02 CONTROL */}
                    {(phase02Status as string) === 'processing' ? (
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100 animate-pulse">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                <span className="text-sm font-medium text-purple-900">Phase 02: Deep Dive Processing...</span>
                            </div>
                        </div>
                    ) : phase02Data ? (
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2">
                                <Brain className="w-4 h-4 text-purple-600"/>
                                <span className="text-sm font-medium text-purple-900">Phase 02: Deep Dive</span>
                            </div>
                            <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Completed</span>
                        </div>
                    ) : (
                         // Fallback manual button if auto failed or manual flow needed
                         <button
                            onClick={onRunPhase02}
                            className="w-full bg-purple-600 text-white py-2 rounded text-sm font-bold"
                         >Run Phase 02 Manually</button>
                    )}

                    {/* PHASE 03 CONTROL */}
                    {(phase03Status as string) === 'processing' ? (
                         <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 animate-pulse">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                                <span className="text-sm font-medium text-orange-900">Phase 03: Exam Mode Processing...</span>
                            </div>
                        </div>
                    ) : phase03Data ? (
                         <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-orange-600"/>
                                <span className="text-sm font-medium text-orange-900">Phase 03: Exam Mode</span>
                            </div>
                            <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded">Active</span>
                        </div>
                    ) : phase02Data && phase03Status !== 'processing' && (
                        // Manual button fallback
                        <button
                            onClick={onRunPhase03}
                            className="w-full bg-orange-600 text-white py-2 rounded text-sm font-bold"
                         >Run Phase 03 Manually</button>
                    )}
                </div>
            )}
        </div>

        {!data && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button
                    onClick={onProcess}
                    disabled={status === 'processing' || (!inputState.text && !inputState.youtubeLink)}
                    className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold shadow-md hover:bg-black transition-all disabled:bg-gray-400 flex justify-center items-center gap-2"
                >
                    {status === 'processing' ? (
                        <span className="animate-pulse">Running Autonomous Pipeline...</span>
                    ) : (
                        <>Initialize Autonomous System <Sparkles className="w-4 h-4"/></>
                    )}
                </button>
            </div>
        )}
      </div>

      {/* RIGHT PANEL - OUTPUT */}
      <div className="w-full lg:w-7/12 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-full overflow-hidden relative">
        {!data ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 p-6 text-center">
                 {status === 'processing' ? (
                     <div className="flex flex-col items-center">
                         <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"></div>
                         <h3 className="text-lg font-bold text-gray-900">Running Autonomous Pipeline</h3>
                         <p className="text-sm mt-2">1. Transcript Generation...</p>
                     </div>
                 ) : (
                    <>
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <FileEdit className="w-8 h-8 text-gray-400"/>
                        </div>
                        <p className="font-medium text-gray-500">System Standby...</p>
                    </>
                 )}
            </div>
        ) : (
            <>
                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
                    <button onClick={() => setActiveView('chapters')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'chapters' ? 'border-brand-600 text-brand-700 bg-brand-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Clock className="w-4 h-4 inline mr-2 mb-0.5"/> Chapters
                    </button>
                    <button onClick={() => setActiveView('transcript')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'transcript' ? 'border-brand-600 text-brand-700 bg-brand-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <CheckCircle2 className="w-4 h-4 inline mr-2 mb-0.5"/> Transcript
                    </button>
                    
                    {phase02Data && (
                        <>
                            <div className="w-px bg-gray-200 mx-1"></div>
                            <button onClick={() => setActiveView('eli5')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'eli5' ? 'border-purple-600 text-purple-700 bg-purple-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <Brain className="w-4 h-4 inline mr-2 mb-0.5"/> ELI5
                            </button>
                            <button onClick={() => setActiveView('formulas')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'formulas' ? 'border-purple-600 text-purple-700 bg-purple-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <Sigma className="w-4 h-4 inline mr-2 mb-0.5"/> Formulas
                            </button>
                            <button onClick={() => setActiveView('doubts')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'doubts' ? 'border-purple-600 text-purple-700 bg-purple-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <MessageSquare className="w-4 h-4 inline mr-2 mb-0.5"/> Doubts
                            </button>
                        </>
                    )}

                    {phase03Data && (
                        <>
                            <div className="w-px bg-gray-200 mx-1"></div>
                            <button onClick={() => setActiveView('revision')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'revision' ? 'border-orange-600 text-orange-700 bg-orange-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <ListChecks className="w-4 h-4 inline mr-2 mb-0.5"/> Revision
                            </button>
                             <button onClick={() => setActiveView('exam')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'exam' ? 'border-orange-600 text-orange-700 bg-orange-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <GraduationCap className="w-4 h-4 inline mr-2 mb-0.5"/> Exam
                            </button>
                             <button onClick={() => setActiveView('clarifications')} className={`px-4 py-4 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeView === 'clarifications' ? 'border-orange-600 text-orange-700 bg-orange-50/30' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                <HelpCircle className="w-4 h-4 inline mr-2 mb-0.5"/> Clarify
                            </button>
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 relative">
                    {/* PHASE 01 VIEWS */}
                    {activeView === 'chapters' && (
                        <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {data.chapters.map((chapter, i) => (
                                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-900 text-base">{chapter.title}</h3>
                                        <span className="text-xs font-mono font-medium bg-brand-100 text-brand-700 px-2 py-1 rounded">
                                            {chapter.timestamp}
                                        </span>
                                    </div>
                                    <div className="p-6">
                                        <ul className="space-y-3">
                                            {chapter.notes.map((note, j) => (
                                                <li key={j} className="flex items-start gap-3 text-gray-700 text-sm">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0"></span>
                                                    <span className="leading-relaxed">{note}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === 'transcript' && (
                        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Cleaned Text</h3>
                                <button onClick={() => handleReadAloud(data.cleaned_transcript)} className="text-brand-600 hover:text-brand-800">
                                     {isPlaying ? <PauseCircle className="w-6 h-6"/> : <PlayCircle className="w-6 h-6"/>}
                                </button>
                             </div>
                             <p className="text-gray-700 leading-8 whitespace-pre-wrap font-serif text-lg">
                                 {data.cleaned_transcript}
                             </p>
                        </div>
                    )}

                    {/* PHASE 02 VIEWS */}
                    {activeView === 'eli5' && phase02Data && (
                        <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                             {phase02Data.eli5_explanations.map((item, i) => (
                                <div key={i} className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
                                     <div className="bg-purple-50/50 px-6 py-3 border-b border-purple-100">
                                        <h3 className="font-bold text-purple-900">{item.chapter_title}</h3>
                                     </div>
                                     <div className="p-6 text-gray-700 leading-relaxed text-sm">
                                        {item.simple_explanation}
                                     </div>
                                </div>
                             ))}
                        </div>
                    )}

                    {activeView === 'formulas' && phase02Data && (
                        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {phase02Data.formulas.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">
                                    <Sigma className="w-12 h-12 mx-auto mb-4 text-gray-300"/>
                                    <p>No mathematical formulas detected in the lecture.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {phase02Data.formulas.map((item, i) => (
                                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                            <div className="font-mono bg-gray-900 text-white p-3 rounded-lg text-center mb-3">
                                                {item.formula}
                                            </div>
                                            <p className="text-sm text-gray-600 text-center">{item.explanation}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === 'doubts' && phase02Data && (
                         <div className="max-w-3xl mx-auto flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="flex-1 space-y-4 mb-4">
                                {allDoubts.length === 0 && (
                                    <div className="text-center text-gray-500 mt-10">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300"/>
                                        <p>Ask a question about the lecture to get a strictly lecture-bound answer.</p>
                                    </div>
                                )}
                                {allDoubts.map((doubt, i) => (
                                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                        <p className="font-bold text-gray-900 mb-2 flex gap-2">
                                            <span className="text-purple-600">Q:</span> {doubt.question}
                                        </p>
                                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                                            {doubt.answer}
                                        </div>
                                    </div>
                                ))}
                             </div>
                             
                             <div className="sticky bottom-0 bg-white p-4 border border-gray-200 rounded-xl shadow-lg flex gap-2">
                                 <input 
                                    type="text" 
                                    className="flex-1 border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Ask a question about the lecture..."
                                    value={doubtInput}
                                    onChange={(e) => setDoubtInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskDoubt()}
                                 />
                                 <button 
                                    onClick={handleAskDoubt}
                                    disabled={askingDoubt || !doubtInput.trim()}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-300"
                                 >
                                     {askingDoubt ? '...' : <Send className="w-5 h-5"/>}
                                 </button>
                             </div>
                         </div>
                    )}

                    {/* PHASE 03 VIEWS */}
                    {activeView === 'revision' && phase03Data && (
                        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-orange-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <ListChecks className="w-6 h-6 text-orange-600"/> Quick Revision Sheet
                                </h3>
                                <ul className="space-y-4">
                                    {phase03Data.revision_sheet.map((point, i) => (
                                        <li key={i} className="flex gap-3 text-gray-700">
                                            <span className="font-bold text-orange-500 text-lg">•</span>
                                            <span className="leading-relaxed">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeView === 'exam' && phase03Data && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* MCQs */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-bold text-gray-800">
                                    Multiple Choice Questions (1 Mark)
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {phase03Data.exam_questions.mcqs.map((mcq, i) => (
                                        <div key={i} className="p-6">
                                            <p className="font-medium text-gray-900 mb-4">{i + 1}. {mcq.question}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {mcq.options.map((opt, j) => (
                                                    <div key={j} className={`p-3 rounded-lg border text-sm ${opt === mcq.correct_answer ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-white border-gray-200 text-gray-600'}`}>
                                                        {String.fromCharCode(65 + j)}. {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Short Answers */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-bold text-gray-800">
                                    Short Answer Questions (3 Marks)
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {phase03Data.exam_questions.short_answers.map((qa, i) => (
                                        <div key={i} className="p-6">
                                            <p className="font-bold text-gray-900 mb-2">Q{i + 1}: {qa.question}</p>
                                            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">{qa.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             {/* Long Answers */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 font-bold text-gray-800">
                                    Long Answer Questions (10 Marks)
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {phase03Data.exam_questions.long_answers.map((qa, i) => (
                                        <div key={i} className="p-6">
                                            <p className="font-bold text-gray-900 mb-4">Q{i + 1}: {qa.question}</p>
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Answer Key:</p>
                                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                                    {qa.answer_outline.map((point, j) => (
                                                        <li key={j}>{point}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'clarifications' && phase03Data && (
                         <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {phase03Data.confusion_clarifications.length === 0 ? (
                                <div className="text-center text-gray-500 mt-10">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500"/>
                                    <p>No common confusion points detected. The lecture seems clear!</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {phase03Data.confusion_clarifications.map((item, i) => (
                                        <div key={i} className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                                            <div className="bg-orange-50 p-4 border-b border-orange-100">
                                                <h4 className="font-bold text-orange-900 flex gap-2">
                                                    <HelpCircle className="w-5 h-5"/> Confusion: "{item.confusing_point}"
                                                </h4>
                                            </div>
                                            <div className="p-5 text-gray-700 leading-relaxed">
                                                <span className="font-bold text-gray-900">Clarification: </span>
                                                {item.clarification}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </>
        )}
      </div>
    </div>
  );
};