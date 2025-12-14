import React, { useState } from 'react';
import { Youtube, Sparkles, MonitorPlay, History, Trash2, ArrowRight } from 'lucide-react';
import { LectureData } from '../types';

interface LandingPageProps {
  onStart: (url: string) => void;
  isProcessing: boolean;
  savedLectures: LectureData[];
  onOpenSaved: (data: LectureData) => void;
  onDeleteSaved: (id: string, e: React.MouseEvent) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
    onStart, 
    isProcessing, 
    savedLectures, 
    onOpenSaved, 
    onDeleteSaved 
}) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onStart(url);
  };

  const formatDate = (isoString: string) => {
      try {
          return new Date(isoString).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
      } catch (e) {
          return '';
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-1 gap-8">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 md:p-14 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-900 text-white shadow-xl rotate-[-6deg] mb-8">
                <MonitorPlay className="w-10 h-10" />
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
            Lecture Analyzer
            </h1>
            <p className="text-lg text-gray-500 mb-10 max-w-lg mx-auto leading-relaxed">
            Transform any YouTube lecture into an interactive revision dashboard. <br/>
            <span className="font-semibold text-brand-600">Zero hallucinations. Single Source of Truth.</span>
            </p>

            <form onSubmit={handleSubmit} className="relative max-w-lg mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Youtube className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="url"
                    required
                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none text-gray-900 placeholder-gray-400 shadow-inner"
                    placeholder="Paste YouTube Lecture URL..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={isProcessing}
                    className="mt-4 w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                    <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Analyzing Video...
                    </span>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            Generate Dashboard
                        </>
                    )}
                </button>
            </form>
            
            <div className="mt-8 text-xs text-gray-400 font-medium">
                Powered by Gemini 2.5 Flash • Search Grounding Enabled
            </div>
        </div>

        {/* Saved Sessions Section */}
        {savedLectures.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-in slide-in-from-bottom-5 fade-in duration-500">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                    <History className="w-5 h-5 text-brand-600"/>
                    <h2 className="text-xl font-bold text-gray-900">Recent Analyses</h2>
                </div>
                
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                    {savedLectures.map((lecture) => (
                        <div 
                            key={lecture.id}
                            onClick={() => onOpenSaved(lecture)}
                            className="group relative p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md hover:bg-brand-50/30 transition-all cursor-pointer bg-gray-50 flex flex-col gap-2"
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-gray-800 line-clamp-1 pr-6">{lecture.videoTitle}</h3>
                                <button 
                                    onClick={(e) => onDeleteSaved(lecture.id, e)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-white transition-colors absolute top-3 right-3"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                            
                            <div className="flex justify-between items-end mt-2">
                                <div className="text-xs text-gray-500">
                                    <span className="bg-white px-2 py-1 rounded border border-gray-200">{lecture.difficulty}</span>
                                    <span className="ml-2">{formatDate(lecture.date)}</span>
                                </div>
                                <span className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-200">
                                    <ArrowRight className="w-5 h-5"/>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
