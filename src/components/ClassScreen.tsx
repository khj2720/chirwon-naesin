import React, { useState, useMemo } from 'react';
import { ClassData, Student } from '../lib/parser';

interface ClassScreenProps {
  classes: ClassData[];
  onSelectStudent: (student: Student, classNum: number) => void;
  onReset: () => void;
}

export function ClassScreen({ classes, onSelectStudent, onReset }: ClassScreenProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number | null>(null);
  const [selectedStudentKey, setSelectedStudentKey] = useState<string>('');

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);
  const subjectCount = classes[0]?.subjects.length || 0;
  const classNames = classes.map(c => c.className).join(', ');

  const currentClass = classes.find(c => c.classNumber === selectedClassNum);
  const students = currentClass ? [...currentClass.students].sort((a, b) => a.번호 - b.번호) : [];

  const handleAnalyze = () => {
    if (selectedStudentKey && currentClass) {
      const student = students.find(s => `${s.학번}_${s.성명}` === selectedStudentKey);
      if (student) {
        onSelectStudent(student, currentClass.classNumber);
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-20 flex min-h-[52px] items-center justify-between border-b border-divider bg-surface px-6 py-2">
        <div className="flex items-center gap-2 font-bold text-lg text-primary">
          <span>1차 시험 분석</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[580px] flex-1 flex-col items-center gap-6 px-6 py-8">
        <div className="w-full rounded-lg border border-border bg-surface px-6 py-4 text-center text-sm text-text-muted">
          <strong className="font-semibold text-text">파싱 완료</strong> — {classNames}, 총 <strong className="font-semibold text-text">{totalStudents}명</strong>, <strong className="font-semibold text-text">{subjectCount}과목</strong>
        </div>

        <div className="flex w-full flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-text-faint">반 선택</span>
          <div className="flex flex-wrap gap-2">
            {classes.map(cls => (
              <button
                key={cls.classNumber}
                className={`flex min-h-[44px] min-w-[60px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                  selectedClassNum === cls.classNumber
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-text-muted hover:border-primary hover:bg-primary-light hover:text-primary'
                }`}
                onClick={() => {
                  setSelectedClassNum(cls.classNumber);
                  setSelectedStudentKey('');
                }}
              >
                {cls.className}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-text-faint" htmlFor="student-select">
            학생 선택
          </label>
          <select
            id="student-select"
            className="min-h-[44px] w-full appearance-none rounded-lg border border-border bg-surface px-3 py-3 pr-8 text-sm text-text bg-no-repeat"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center' }}
            value={selectedStudentKey}
            onChange={(e) => setSelectedStudentKey(e.target.value)}
            disabled={!selectedClassNum}
          >
            <option value="">{selectedClassNum ? '학생을 선택하세요' : '반을 먼저 선택하세요'}</option>
            {students.map(s => (
              <option key={`${s.학번}_${s.성명}`} value={`${s.학번}_${s.성명}`}>
                {s.번호}번 {s.성명}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <button 
            className="btn btn-primary w-full max-w-[320px] py-3 text-base"
            disabled={!selectedStudentKey}
            onClick={handleAnalyze}
          >
            분석 시작
          </button>
          <button 
            className="btn btn-ghost w-full max-w-[320px]"
            onClick={onReset}
          >
            다른 파일 업로드
          </button>
        </div>
      </div>
    </div>
  );
}
