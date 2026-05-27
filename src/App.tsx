import React, { useState, useEffect } from 'react';
import { UploadScreen } from './components/UploadScreen';
import { ClassScreen } from './components/ClassScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ClassData } from './lib/parser';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function App() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassNum, setSelectedClassNum] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoomLevel * 16}px`;
  }, [zoomLevel]);

  const handleZoomIn = () => setZoomLevel(p => Math.min(p + 0.1, 1.5));
  const handleZoomOut = () => setZoomLevel(p => Math.max(p - 0.1, 0.7));
  const handleZoomReset = () => setZoomLevel(1);

  return (
    <>
      <div className="min-h-screen print:min-h-0 print:h-auto">
        {classes.length === 0 ? (
          <UploadScreen onUpload={(data) => setClasses(data)} />
        ) : !selectedStudent || selectedClassNum === null ? (
          <ClassScreen 
            classes={classes} 
            onSelectStudent={(student, classNum) => {
              setSelectedClassNum(classNum);
              setSelectedStudent(student);
            }}
            onReset={() => setClasses([])}
          />
        ) : (
          <DashboardScreen 
            classes={classes}
            student={selectedStudent}
            classNum={selectedClassNum}
            onChangeStudent={(student, classNum) => {
              setSelectedStudent(student);
              setSelectedClassNum(classNum);
            }}
            onReset={() => {
              setClasses([]);
              setSelectedClassNum(null);
              setSelectedStudent(null);
            }}
          />
        )}
      </div>

      {/* Floating Zoom Controls */}
      <div className="fixed bottom-6 left-6 z-[100] flex items-center gap-1.5 rounded-full bg-surface border border-divider shadow-xl p-1.5 print:hidden">
        <button 
          onClick={handleZoomOut} 
          className="p-2 rounded-full hover:bg-surface-2 transition-colors text-text-muted hover:text-text cursor-pointer"
          title="축소"
        >
          <ZoomOut className="w-6 h-6" />
        </button>
        <span className="text-sm font-black text-text w-16 text-center tabular-nums cursor-pointer" onClick={handleZoomReset} title="초기화">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button 
          onClick={handleZoomIn} 
          className="p-2 rounded-full hover:bg-surface-2 transition-colors text-text-muted hover:text-text cursor-pointer"
          title="확대"
        >
          <ZoomIn className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}
