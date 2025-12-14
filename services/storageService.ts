import { LectureData } from '../types';

const STORAGE_KEY = 'lecture_mate_data_v1';

export const saveLectureToStorage = (lecture: LectureData): LectureData[] => {
  const existing = getLecturesFromStorage();
  // Check if exists (update) or add new.
  // Since we generate a new ID on every process, this is usually an append,
  // but good for future proofing if we edit existing.
  const index = existing.findIndex(l => l.id === lecture.id);
  let updated;
  if (index >= 0) {
    updated = [...existing];
    updated[index] = lecture;
  } else {
    updated = [lecture, ...existing];
  }
  // Limit to last 20 to prevent localStorage overflow
  if (updated.length > 20) {
    updated = updated.slice(0, 20);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const getLecturesFromStorage = (): LectureData[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load lectures", e);
    return [];
  }
};

export const deleteLectureFromStorage = (id: string): LectureData[] => {
  const existing = getLecturesFromStorage();
  const updated = existing.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};
