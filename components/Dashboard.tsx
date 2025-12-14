import React, { useState, useEffect, useRef } from 'react';
import { LectureData, ChatMessage } from '../types';
import { Play, FileText, Sigma, MessageSquare, ArrowLeft, Search, Sparkles, X, Send, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { askDoubt, explainLikeIm5 } from '../services/geminiService';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface DashboardProps {
  data: LectureData;
  onBack: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onBack }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'formulas'>('notes');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  
  // ELI5 State
  const [selection, setSelection] = useState<string | null>(null);
  const [eli5Result, setEli5Result] = useState<string | null>(null);
  const [isEli5Loading, setIsEli5Loading] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{top: number, left: number} | null>(null);
  const [showEli5Hint, setShowEli5Hint] = useState(false);

  // Video Player State
  const [videoId, setVideoId] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // PDF State
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    // Parse Video ID from URL
    const extractId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url?.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };
    if (data.videoUrl) {
        const id = extractId(data.videoUrl);
        if (id) setVideoId(id);
    }
  }, [data.videoUrl]);

  const timeToSeconds = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').reverse();
      let seconds = 0;
      for (let i = 0; i < parts.length; i++) {
          seconds += parseInt(parts[i]) * Math.pow(60, i);
      }
      return seconds;
  };

  const handleChapterClick = (timeStr: string) => {
      const seconds = timeToSeconds(timeStr);
      
      // Use YouTube IFrame API via postMessage for smooth seeking without reload
      if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [seconds, true]
          }), '*');
          
          iframeRef.current.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'playVideo',
              args: []
          }), '*');
      }
  };

  // Handle text selection
  useEffect(() => {
    const handleSelection = (e: MouseEvent) => {
      // Don't trigger if clicking inside the popup
      if ((e.target as HTMLElement).closest('.eli5-popup')) return;

      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate position relative to viewport, but ensure it stays on screen
        let top = rect.top - 60; // Default above selection
        if (top < 100) top = rect.bottom + 10; // Flip to below if too close to top
        
        setSelection(sel.toString());
        setPopupPosition({
            top: top,
            left: rect.left + (rect.width / 2)
        });
        setEli5Result(null); // Reset result on new selection
      } else {
        // Clear selection if clicking elsewhere
        setSelection(null);
        setPopupPosition(null);
      }
    };
    
    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  const handleEli5 = async () => {
    if (!selection) return;
    setIsEli5Loading(true);
    setEli5Result(null);
    try {
        const result = await explainLikeIm5(selection, data.transcript);
        setEli5Result(result);
    } catch (e) {
        setEli5Result("Could not simplify this text.");
    }
    setIsEli5Loading(false);
  };

  const handleNavEli5Click = () => {
      if (!selection) {
          setShowEli5Hint(true);
          setTimeout(() => setShowEli5Hint(false), 4000);
      }
  };

  const closeEli5 = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelection(null);
      setEli5Result(null);
      setPopupPosition(null);
      window.getSelection()?.removeAllRanges();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
        const answer = await askDoubt(data.transcript, userMsg.content);
        setChatHistory(prev => [...prev, { role: 'ai', content: answer }]);
    } catch (error) {
        setChatHistory(prev => [...prev, { role: 'ai', content: "Error connecting to Doubt Resolver." }]);
    }
    setIsChatting(false);
  };

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setIsPdfGenerating(true);
    
    try {
        const element = pdfRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        // Calculate dimensions to fit width
        const imgHeightInPdf = pdfWidth / ratio;
        
        let heightLeft = imgHeightInPdf;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;

        // Subsequent pages
        while (heightLeft >= 0) {
            position = heightLeft - imgHeightInPdf;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${data.videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}_StudyNotes.pdf`);
    } catch (error) {
        console.error("PDF Generation failed", error);
        alert("Could not generate PDF. Please try again.");
    }
    setIsPdfGenerating(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* ELI5 Hint Toast */}
      {showEli5Hint && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-5 duration-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400"/>
              <span className="text-sm font-bold">Highlight any text in the notes to see the magic!</span>
          </div>
      )}

      {/* ELI5 Popup */}
      {popupPosition && selection && (
        <div 
            className="eli5-popup fixed z-50 bg-white shadow-2xl rounded-xl border-2 border-red-100 w-80 p-4 animate-in fade-in zoom-in duration-200"
            style={{ top: popupPosition.top, left: popupPosition.left, transform: 'translateX(-50%)' }}
            onMouseUp={(e) => e.stopPropagation()} 
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Explain Like I'm 5
                </div>
                <button onClick={closeEli5} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            {!eli5Result && !isEli5Loading && (
                <button 
                    onClick={handleEli5}
                    className="w-full bg-red-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                    Simplify "{selection.substring(0, 15)}..."
                </button>
            )}

            {isEli5Loading && (
                <div className="text-center py-4 text-red-500 text-sm">
                    Simplifying concepts...
                </div>
            )}

            {eli5Result && (
                <div className="text-sm text-gray-700 bg-red-50 p-3 rounded-lg leading-relaxed border border-red-100 max-h-60 overflow-y-auto">
                    {eli5Result}
                </div>
            )}
        </div>
      )}

      {/* Hidden PDF Container */}
      <div 
        style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm', minHeight: '297mm', background: 'white', zIndex: -10 }}
      >
        <div ref={pdfRef} className="p-10 bg-white text-gray-900 font-sans">
            <h1 className="text-3xl font-bold mb-2">{data.videoTitle}</h1>
            <a href={data.videoUrl} className="text-blue-600 text-sm mb-6 block underline">{data.videoUrl}</a>
            <p className="text-sm text-gray-500 mb-8">Generated by LectureMate AI • {new Date().toLocaleDateString()}</p>

            <hr className="border-gray-300 mb-8"/>

            <h2 className="text-2xl font-bold mb-4 text-gray-800">1. Chapters</h2>
            <div className="mb-8">
                {data.chapters.map((c, i) => (
                    <div key={i} className="flex justify-between border-b border-gray-100 py-2">
                        <span>{c.title}</span>
                        <span className="font-mono text-gray-500">{c.start}</span>
                    </div>
                ))}
            </div>

            <h2 className="text-2xl font-bold mb-4 text-gray-800">2. Exam Notes</h2>
            <div className="space-y-6 mb-8">
                {data.examNotes.map((section, i) => (
                    <div key={i}>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">{section.chapterTitle}</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            {section.points.map((p, j) => (
                                <li key={j} className="text-gray-800 text-sm leading-relaxed">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath]} 
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {p}
                                    </ReactMarkdown>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {data.formulas.length > 0 && (
                <>
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">3. Key Formulas</h2>
                    <div className="grid gap-4 mb-8">
                        {data.formulas.map((f, i) => (
                            <div key={i} className="border border-gray-200 rounded p-4 break-inside-avoid">
                                <div className="text-center my-2 text-lg">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath]} 
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {f.equation}
                                    </ReactMarkdown>
                                </div>
                                <p className="text-sm text-gray-600 italic mt-2">{f.context}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
            
            {data.examQuestions && data.examQuestions.length > 0 && (
                 <>
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">4. Possible Exam Questions</h2>
                    <ol className="list-decimal pl-5 space-y-4">
                        {data.examQuestions.map((q, i) => (
                            <li key={i} className="text-gray-800">{q}</li>
                        ))}
                    </ol>
                 </>
            )}
        </div>
      </div>


      {/* Sidebar: Chapters */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-gray-100">
             <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4">
                <ArrowLeft className="w-3 h-3"/> New Video
             </button>
             <h2 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                 {data.videoTitle || "Analyzed Lecture"}
             </h2>
             <div className="mt-2 text-xs text-green-600 bg-green-50 inline-block px-2 py-1 rounded-full font-medium border border-green-100">
                 Source of Truth Active
             </div>
             
             {/* PDF Download Button */}
             <button 
                onClick={handleDownloadPDF}
                disabled={isPdfGenerating}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-black transition-all disabled:bg-gray-400"
             >
                 {isPdfGenerating ? (
                    <span className="flex items-center gap-2">Generating...</span>
                 ) : (
                    <>
                        <Download className="w-4 h-4" /> Download PDF
                    </>
                 )}
             </button>
        </div>
        <div className="flex-1 overflow-y-auto">
            <h3 className="px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Chapters</h3>
            <div className="space-y-1 px-3">
                {data.chapters.map((chapter, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleChapterClick(chapter.start)}
                        className="group flex flex-col p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100"
                    >
                         <div className="flex justify-between items-center mb-1">
                             <span className="text-xs font-mono text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Play className="w-3 h-3"/> {chapter.start}
                             </span>
                             <span className="text-xs text-gray-400">{chapter.end}</span>
                         </div>
                         <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{chapter.title}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Video Player Section */}
        {videoId && (
            <div className="w-full bg-black aspect-video max-h-[40vh] shrink-0">
                <iframe 
                    ref={iframeRef}
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                ></iframe>
            </div>
        )}

        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex space-x-4">
                <button 
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'notes' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <FileText className="w-4 h-4"/> Exam Notes
                </button>
                <button 
                    onClick={() => setActiveTab('formulas')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'formulas' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <Sigma className="w-4 h-4"/> Formulas
                </button>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={handleNavEli5Click}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all shadow-sm"
                >
                    <Sparkles className="w-4 h-4"/> Explain Like I'm 5
                </button>

                <button 
                    onClick={() => setChatOpen(!chatOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${chatOpen ? 'bg-brand-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                    <MessageSquare className="w-4 h-4"/> Doubt Resolver
                </button>
            </div>
        </div>

        {/* Content Render */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                {activeTab === 'notes' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {data.examNotes.map((section, i) => (
                            <div key={i} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
                                    <span className="text-brand-500">#</span> {section.chapterTitle}
                                </h3>
                                <ul className="space-y-4">
                                    {section.points.map((point, j) => (
                                        <li key={j} className="flex gap-4 items-start text-gray-700 leading-relaxed group">
                                            <span className="mt-2 w-1.5 h-1.5 bg-gray-300 rounded-full group-hover:bg-brand-500 transition-colors"></span>
                                            <span className="selection:bg-purple-200 selection:text-purple-900 cursor-text">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkMath]} 
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {point}
                                                </ReactMarkdown>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'formulas' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {data.formulas.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                                <Sigma className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
                                <p className="text-gray-500">No specific formulas were identified in this lecture.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {data.formulas.map((item, i) => (
                                    <div key={i} className="bg-white overflow-hidden rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="bg-gray-900 text-white p-6 flex items-center justify-center font-mono text-xl overflow-x-auto">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkMath]} 
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {item.equation}
                                            </ReactMarkdown>
                                        </div>
                                        <div className="p-6">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Context</h4>
                                            <p className="text-gray-700 selection:bg-purple-200 selection:text-purple-900">{item.context}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Floating Chatbox */}
        {chatOpen && (
            <div className="absolute right-6 bottom-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[500px] animate-in slide-in-from-bottom-5 duration-200 z-20">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Search className="w-4 h-4"/> Doubt Resolver
                    </h3>
                    <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-gray-400 mt-10 text-sm">
                            <p>Ask anything about the lecture.</p>
                            <p className="mt-2 text-xs">I only know what's in the transcript.</p>
                        </div>
                    )}
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isChatting && (
                        <div className="flex justify-start">
                             <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none flex gap-1">
                                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                 <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                             </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100">
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm outline-none"
                            placeholder="Type your question..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim() || isChatting}
                            className="absolute right-2 top-2 text-brand-600 p-1 hover:bg-brand-50 rounded disabled:text-gray-300"
                        >
                            <Send className="w-5 h-5"/>
                        </button>
                    </div>
                </form>
            </div>
        )}
      </div>
    </div>
  );
};