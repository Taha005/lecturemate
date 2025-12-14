import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, FileText, X, Image as ImageIcon } from 'lucide-react';
import { InputState } from '../types';

interface InputSectionProps {
  inputState: InputState;
  setInputState: React.Dispatch<React.SetStateAction<InputState>>;
  onSubmit: () => void;
  isProcessing: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({ inputState, setInputState, onSubmit, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'youtube'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setInputState(prev => ({ ...prev, images: [...prev.images, ...newFiles] }));
    }
  };

  const removeImage = (index: number) => {
    setInputState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800">1. Input Lecture Material</h2>
        <p className="text-sm text-gray-500">Upload notes, images, or links to get started.</p>
      </div>

      <div className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
        {/* Tabs */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'text' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Notes</span>
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'image' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Images</span>
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'youtube' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>YouTube</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'text' && (
            <textarea
              className="w-full h-48 md:h-64 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none text-sm"
              placeholder="Paste your lecture notes or text here..."
              value={inputState.text}
              onChange={(e) => setInputState(prev => ({ ...prev, text: e.target.value }))}
            />
          )}

          {activeTab === 'image' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">Click to upload images</p>
                <p className="text-xs text-gray-500">Slides, whiteboard photos (PNG, JPG)</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                  multiple
                />
              </div>

              {inputState.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {inputState.images.map((file, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`upload-${idx}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'youtube' && (
            <div className="space-y-4">
               <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full rounded-md border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={inputState.youtubeLink}
                    onChange={(e) => setInputState(prev => ({ ...prev, youtubeLink: e.target.value }))}
                />
               </div>
               <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                  Note: The AI will use Search Grounding to find information about this video link. For best results, also paste relevant transcript notes if available in the text tab.
               </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onSubmit}
          disabled={isProcessing || (!inputState.text && inputState.images.length === 0 && !inputState.youtubeLink)}
          className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-md transition-all ${
            isProcessing || (!inputState.text && inputState.images.length === 0 && !inputState.youtubeLink)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 transform hover:-translate-y-0.5'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Material...
            </span>
          ) : 'Generate Summary & Revision'}
        </button>
      </div>
    </div>
  );
};
