import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { process_youtube_url } from './services/geminiService';
import { getLecturesFromStorage, saveLectureToStorage, deleteLectureFromStorage } from './services/storageService';
import { LectureData } from './types';

const App: React.FC = () => {
  const [lectureData, setLectureData] = useState<LectureData | null>(null);
  const [savedLectures, setSavedLectures] = useState<LectureData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load saved lectures on mount
  useEffect(() => {
    setSavedLectures(getLecturesFromStorage());
  }, []);

  const handleStart = async (url: string) => {
    setIsProcessing(true);
    try {
      const data = await process_youtube_url(url);
      setLectureData(data);
      // Save and update state
      const updatedList = saveLectureToStorage(data);
      setSavedLectures(updatedList);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze video. Please check the URL and try again.");
    }
    setIsProcessing(false);
  };

  const handleOpenSaved = (data: LectureData) => {
    setLectureData(data);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this analysis?")) {
        const updated = deleteLectureFromStorage(id);
        setSavedLectures(updated);
    }
  };

  const handleBack = () => {
    setLectureData(null);
  };

  if (lectureData) {
    return <Dashboard data={lectureData} onBack={handleBack} />;
  }

  return (
    <LandingPage 
        onStart={handleStart} 
        isProcessing={isProcessing} 
        savedLectures={savedLectures}
        onOpenSaved={handleOpenSaved}
        onDeleteSaved={handleDelete}
    />
  );
};

export default App;
