import React, { useState } from 'react';
import { LectureData } from '../types';
import { Zap, HelpCircle, CheckCircle, MessageSquare, ArrowRight, Brain, RotateCcw } from 'lucide-react';
import { evaluateExplanation } from '../services/geminiService';

interface RevisionHelperProps {
  data: LectureData | null;
  onNavigateToSummarizer: () => void;
}

export const RevisionHelper: React.FC<RevisionHelperProps> = ({ data, onNavigateToSummarizer }) => {
  const [activeMode, setActiveMode] = useState<'dashboard' | 'quick' | 'practice' | 'confidence' | 'teach'>('dashboard');
  const [teachInput, setTeachInput] = useState('');
  const [teachFeedback, setTeachFeedback] = useState<any>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [confidenceIndex, setConfidenceIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  if (!data) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="bg-gray-100 p-6 rounded-full mb-6">
                <Brain className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Revision Material Yet</h2>
            <p className="text-gray-600 mb-8 max-w-md">You need to analyze a lecture first before you can start revising.</p>
            <button 
                onClick={onNavigateToSummarizer}
                className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors"
            >
                Go to Lecture Summarizer
            </button>
        </div>
    );
  }

  const handleTeachSubmit = async () => {
      setIsEvaluating(true);
      try {
          const result = await evaluateExplanation(data.topicName, teachInput);
          setTeachFeedback(result);
      } catch (e) {
          alert("Error evaluating answer");
      }
      setIsEvaluating(false);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-end border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{data.topicName || "Lecture Topic"}</h2>
            <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${data.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {data.difficulty} Difficulty
            </span>
          </div>
       </div>

       <div className="grid md:grid-cols-2 gap-6">
           {/* Card 1 */}
           <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 text-yellow-600">
                   <Zap className="w-6 h-6"/>
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Revision</h3>
               <p className="text-sm text-gray-600 mb-4">Review one-liners, definitions, and key formulas in 60 seconds.</p>
               <button onClick={() => setActiveMode('quick')} className="text-sm font-semibold text-yellow-700 hover:text-yellow-800 flex items-center gap-1">
                   Start Quick Revision <ArrowRight className="w-4 h-4"/>
               </button>
           </div>

           {/* Card 2 */}
           <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4 text-green-600">
                   <HelpCircle className="w-6 h-6"/>
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">Practice Questions</h3>
               <p className="text-sm text-gray-600 mb-4">Solve generated MCQs and short answer questions.</p>
               <button onClick={() => setActiveMode('practice')} className="text-sm font-semibold text-green-700 hover:text-green-800 flex items-center gap-1">
                   Practice Now <ArrowRight className="w-4 h-4"/>
               </button>
           </div>

           {/* Card 3 */}
           <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                   <CheckCircle className="w-6 h-6"/>
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">Confidence Check</h3>
               <p className="text-sm text-gray-600 mb-4">5 rapid-fire questions to gauge your readiness.</p>
               <button onClick={() => setActiveMode('confidence')} className="text-sm font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1">
                   Test Confidence <ArrowRight className="w-4 h-4"/>
               </button>
           </div>

           {/* Card 4 */}
           <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
               <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600">
                   <MessageSquare className="w-6 h-6"/>
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-2">Teach Me Back</h3>
               <p className="text-sm text-gray-600 mb-4">Explain a concept in your own words and get AI feedback.</p>
               <button onClick={() => setActiveMode('teach')} className="text-sm font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1">
                   Evaluate My Answer <ArrowRight className="w-4 h-4"/>
               </button>
           </div>
       </div>
    </div>
  );

  const renderQuickRevision = () => (
      <div className="h-full flex flex-col">
          <button onClick={() => setActiveMode('dashboard')} className="self-start mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              ← Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">⚡ Quick Revision</h2>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {data.quickRevision.map((point, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg border-l-4 border-yellow-400 shadow-sm">
                      <p className="text-gray-700">{point}</p>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderPractice = () => (
      <div className="h-full flex flex-col">
          <button onClick={() => setActiveMode('dashboard')} className="self-start mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              ← Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Practice Questions</h2>
          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              {data.practiceQuestions.map((q, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-gray-900 text-lg">Q{i+1}: {q.question}</h4>
                          <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">{q.type}</span>
                      </div>
                      
                      {q.options && (
                          <div className="grid grid-cols-1 gap-2 mb-4">
                              {q.options.map((opt, idx) => (
                                  <div key={idx} className="p-3 border rounded-lg hover:bg-gray-50 text-sm text-gray-700 cursor-pointer">
                                      {opt}
                                  </div>
                              ))}
                          </div>
                      )}

                      <details className="mt-4">
                          <summary className="text-sm text-brand-600 font-medium cursor-pointer hover:text-brand-700">Show Answer</summary>
                          <div className="mt-2 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                              {q.answer}
                          </div>
                      </details>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderConfidence = () => {
    const q = data.confidenceQuestions[confidenceIndex];
    if (!q) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                    <CheckCircle className="w-12 h-12 text-blue-600"/>
                </div>
                <h2 className="text-2xl font-bold mb-2">Confidence Check Complete!</h2>
                <p className="text-gray-600 mb-6">You scored {confidenceScore} out of {data.confidenceQuestions.length}</p>
                <div className="flex gap-4">
                    <button onClick={() => setActiveMode('dashboard')} className="text-gray-600 hover:text-gray-900">Back to Dashboard</button>
                    <button onClick={() => { setConfidenceIndex(0); setConfidenceScore(0); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Try Again</button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col max-w-2xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <button onClick={() => setActiveMode('dashboard')} className="text-sm text-gray-500">Quit</button>
                <span className="text-sm font-medium text-gray-400">Question {confidenceIndex + 1}/{data.confidenceQuestions.length}</span>
             </div>

             <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex-1 flex flex-col justify-center">
                 <h3 className="text-xl font-bold text-gray-900 mb-8">{q.question}</h3>
                 <div className="space-y-3">
                     {q.options?.map((opt, i) => (
                         <button 
                            key={i} 
                            onClick={() => {
                                if (opt === q.answer) setConfidenceScore(s => s + 1);
                                setConfidenceIndex(i => i + 1);
                            }}
                            className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-medium text-gray-700"
                         >
                             {opt}
                         </button>
                     ))}
                 </div>
             </div>
        </div>
    );
  };

  const renderTeach = () => (
      <div className="h-full flex flex-col">
          <button onClick={() => setActiveMode('dashboard')} className="self-start mb-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              ← Back to Dashboard
          </button>
          
          <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Teach Me Back</h2>
              <p className="text-gray-500 text-sm mb-6">Explain the core concept of "{data.topicName}" in your own words.</p>
              
              {!teachFeedback ? (
                  <>
                    <textarea 
                        className="flex-1 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 mb-4"
                        placeholder="Start typing your explanation..."
                        value={teachInput}
                        onChange={(e) => setTeachInput(e.target.value)}
                    />
                    <button 
                        onClick={handleTeachSubmit}
                        disabled={!teachInput || isEvaluating}
                        className="bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-300"
                    >
                        {isEvaluating ? 'Evaluating...' : 'Submit Explanation'}
                    </button>
                  </>
              ) : (
                  <div className="flex-1 overflow-y-auto">
                      <div className="bg-purple-50 p-6 rounded-xl mb-6">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="text-lg font-bold text-purple-900">Feedback</h3>
                              <span className="text-2xl font-bold text-purple-600">{teachFeedback.score}/100</span>
                          </div>
                          <p className="text-purple-800 mb-4">{teachFeedback.feedback}</p>
                          
                          {teachFeedback.missingPoints?.length > 0 && (
                              <div className="bg-white p-4 rounded-lg mb-4">
                                  <h4 className="font-bold text-gray-700 mb-2 text-sm">Missed Concepts:</h4>
                                  <ul className="list-disc pl-4 text-sm text-gray-600">
                                      {teachFeedback.missingPoints.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                  </ul>
                              </div>
                          )}

                          <div className="bg-white p-4 rounded-lg">
                              <h4 className="font-bold text-gray-700 mb-2 text-sm">Better way to say it:</h4>
                              <p className="text-sm text-gray-600 italic">"{teachFeedback.correction}"</p>
                          </div>
                      </div>
                      <button 
                        onClick={() => { setTeachFeedback(null); setTeachInput(''); }}
                        className="w-full py-3 border-2 border-purple-600 text-purple-600 rounded-lg font-bold hover:bg-purple-50"
                      >
                          Try Again
                      </button>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="h-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden p-6">
       {activeMode === 'dashboard' && renderDashboard()}
       {activeMode === 'quick' && renderQuickRevision()}
       {activeMode === 'practice' && renderPractice()}
       {activeMode === 'confidence' && renderConfidence()}
       {activeMode === 'teach' && renderTeach()}
    </div>
  );
};
