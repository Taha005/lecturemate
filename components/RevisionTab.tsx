import React, { useState } from 'react';
import { LectureData, MindMapNode } from '../types';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, ChevronDown, CheckCircle, HelpCircle, FileText, Brain, GraduationCap } from 'lucide-react';

interface RevisionTabProps {
  data: LectureData;
}

export const RevisionTab: React.FC<RevisionTabProps> = ({ data }) => {
  const [activeSubTab, setActiveSubTab] = useState<'practice' | 'sheet' | 'mindmap' | 'exam'>('practice');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 overflow-x-auto">
        <TabButton 
            active={activeSubTab === 'practice'} 
            onClick={() => setActiveSubTab('practice')} 
            icon={<HelpCircle size={16}/>} 
            label="Practice Questions" 
        />
        <TabButton 
            active={activeSubTab === 'sheet'} 
            onClick={() => setActiveSubTab('sheet')} 
            icon={<FileText size={16}/>} 
            label="Revision Sheet" 
        />
        <TabButton 
            active={activeSubTab === 'mindmap'} 
            onClick={() => setActiveSubTab('mindmap')} 
            icon={<Brain size={16}/>} 
            label="Mind Map" 
        />
        <TabButton 
            active={activeSubTab === 'exam'} 
            onClick={() => setActiveSubTab('exam')} 
            icon={<GraduationCap size={16}/>} 
            label="Exam Prep" 
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2">
        {activeSubTab === 'practice' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <HelpCircle className="text-brand-500"/> Self-Assessment
            </h3>
            <div className="space-y-4">
              {data.practiceQuestions.map((q, idx) => (
                <QuestionCard key={idx} question={q.question} answer={q.answer} index={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'sheet' && (
          <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-brand-500"/> One-Page Summary
            </h3>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 prose prose-sm max-w-none prose-headings:text-brand-700">
              <ReactMarkdown>{data.revisionSheet}</ReactMarkdown>
            </div>
          </div>
        )}

        {activeSubTab === 'mindmap' && (
          <div className="space-y-4">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Brain className="text-brand-500"/> Concept Map
            </h3>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              <MindMapTree node={data.mindMap} />
            </div>
          </div>
        )}

        {activeSubTab === 'exam' && (
           <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap className="text-brand-500"/> Possible Exam Questions
            </h3>
             <div className="grid gap-4">
               {data.examQuestions.map((q, idx) => (
                 <div key={idx} className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-lg border border-indigo-100 shadow-sm">
                   <div className="flex items-start gap-3">
                     <span className="bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded text-sm">Q{idx + 1}</span>
                     <p className="font-medium text-gray-800 leading-relaxed">{q}</p>
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

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 justify-center ${
            active 
            ? 'bg-white text-brand-600 shadow-sm ring-1 ring-black/5' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
        }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

interface QuestionCardProps {
  question: string;
  answer: string;
  index: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, answer, index }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div 
        className="p-4 cursor-pointer bg-gray-50 hover:bg-white transition-colors flex justify-between items-start"
        onClick={() => setShowAnswer(!showAnswer)}
      >
        <div className="flex gap-3">
             <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold mt-0.5">
                {index}
             </span>
             <h4 className="font-medium text-gray-900">{question}</h4>
        </div>
        <div className="ml-4 text-gray-400">
            {showAnswer ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </div>
      {showAnswer && (
        <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
           <div className="flex gap-3 ml-9">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-600 text-sm leading-relaxed">{answer}</p>
           </div>
        </div>
      )}
    </div>
  );
};

interface MindMapTreeProps {
  node: MindMapNode;
  level?: number;
}

// Recursive Mind Map Component
const MindMapTree: React.FC<MindMapTreeProps> = ({ node, level = 0 }) => {
    if (!node) return null;

    return (
        <div className="font-mono text-sm">
            <div 
                className={`flex items-center py-1.5 ${level === 0 ? 'font-bold text-lg text-brand-700 mb-2' : ''}`}
                style={{ paddingLeft: `${level * 24}px` }}
            >
                {level > 0 && (
                    <div className="w-4 border-t border-gray-300 mr-2 relative top-0"></div>
                )}
                <div className={`
                    rounded px-2 py-1 border 
                    ${level === 0 ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-200'}
                `}>
                    {node.title}
                </div>
            </div>
            {node.children && node.children.map((child, idx) => (
                <MindMapTree key={idx} node={child} level={level + 1} />
            ))}
        </div>
    );
};