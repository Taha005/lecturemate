import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PlayCircle, PauseCircle } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface SummaryTabProps {
  summary: string[];
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ summary }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const handleReadAloud = async () => {
    if (isPlaying && audioSource) {
      audioSource.stop();
      setIsPlaying(false);
      return;
    }

    try {
      // Concatenate summary for reading
      const textToRead = summary.join(". ");
      const base64Audio = await generateSpeech(textToRead);
      
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);

      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      
      source.start(0);
      setAudioSource(source);
      setIsPlaying(true);

    } catch (error) {
      console.error("TTS Error:", error);
      alert("Failed to generate speech. Please try again.");
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Key Concepts</h3>
          <button 
            onClick={handleReadAloud}
            className="flex items-center space-x-2 text-brand-600 hover:text-brand-800 transition-colors font-medium text-sm"
          >
              {isPlaying ? <PauseCircle className="w-5 h-5"/> : <PlayCircle className="w-5 h-5"/>}
              <span>{isPlaying ? "Stop Reading" : "Read Aloud"}</span>
          </button>
      </div>

      <div className="prose prose-blue max-w-none">
        <ul className="space-y-3">
          {summary.map((point, index) => (
            <li key={index} className="flex items-start text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
               <span className="inline-block w-2 h-2 mt-2.5 mr-3 bg-brand-500 rounded-full flex-shrink-0"></span>
               <div className="flex-1">
                 <ReactMarkdown 
                    components={{
                        strong: ({node, ...props}) => <span className="font-bold text-brand-800 bg-brand-50 px-1 rounded" {...props} />
                    }}
                 >
                    {point}
                 </ReactMarkdown>
               </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
