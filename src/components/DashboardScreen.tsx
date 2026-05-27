import React, { useMemo, useState } from 'react';
import { 
  Moon, 
  Sun, 
  RotateCcw, 
  Users, 
  Award, 
  BookOpen, 
  TrendingUp, 
  ChevronRight, 
  Check, 
  Sparkles, 
  Printer, 
  FileSpreadsheet, 
  Layers,
  School
} from 'lucide-react';
import { ClassData, Student, aggregateSchoolWide } from '../lib/parser';
import { 
  analyzeStudent, computeAvgGrade, getRank, getPercentile, SubjectAnalysis, Boundary 
} from '../lib/grading';
import { RadarChart } from './RadarChart';
import { ChirwonLogo } from './Logo';
import { formatSubjectName } from '../lib/utils';

interface DashboardScreenProps {
  classes: ClassData[];
  student: Student;
  classNum: number;
  onChangeStudent: (student: Student, classNum: number) => void;
  onReset: () => void;
}

interface SubjectPositionBarProps {
  percentile: number | null;
  score: number | null;
  grade: number | null;
  schoolRank: number | null;
  schoolN: number;
  boundaries?: Boundary[];
}

export function SubjectPositionBar({ 
  percentile, 
  score, 
  grade,
  schoolRank,
  schoolN,
  boundaries
}: SubjectPositionBarProps) {
  if (percentile === null || score === null) return null;

  // Clamp position to keep it in view. Left is bottom%, right is top%.
  const studentPos = Math.max(2, Math.min(98, percentile));

  return (
    <div className="mt-1 mb-1 w-full select-none">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-bold text-text-muted flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
          <span>등급 내 위치 (백분위 {Math.round(percentile * 10) / 10}%)</span>
        </span>
      </div>

      {/* Simple, modern line indicator */}
      <div className="relative w-full h-2 bg-slate-200 rounded-full mt-5 mb-2 flex items-center">
        {/* Boundary Marks */}
        {[10, 34, 66, 90].map(boundaryPos => (
          <div 
            key={boundaryPos} 
            className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 bg-slate-300 z-0" 
            style={{ left: `${boundaryPos}%` }} 
          />
        ))}

        {/* Filled region */}
        <div 
          className="absolute h-full bg-primary/80 rounded-full z-0"
          style={{ width: `${studentPos}%` }}
        />

        {/* Minimal dot showing position */}
        <div 
          className="absolute top-1/2 flex flex-col items-center pointer-events-none z-10"
          style={{ left: `${studentPos}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-3 h-3 rounded-full border-[1.5px] border-white bg-primary shadow-[0_0_2px_rgba(0,0,0,0.1)]" />
        </div>
      </div>

      {/* Simple segment benchmarks below */}
      <div className="relative flex text-sm font-extrabold text-slate-400 mt-2 h-8 tracking-tight">
        <span className="absolute text-center transform -translate-x-[50%] flex flex-col items-center leading-normal whitespace-nowrap" style={{ left: '5%' }}>
          <span>5등급 이하</span>
        </span>
        <span className="absolute text-center transform -translate-x-[50%] flex flex-col items-center leading-normal whitespace-nowrap" style={{ left: '22%' }}>
          <span>4등급</span>
          {(() => {
            const cut = boundaries?.find(b => b.grade === 4)?.boundaryScore;
            return cut !== undefined && cut !== null ? (
              <span className="text-xs opacity-90 font-mono text-text-muted font-bold mt-0.5">{cut}점</span>
            ) : null;
          })()}
        </span>
        <span className="absolute text-center transform -translate-x-[50%] flex flex-col items-center leading-normal whitespace-nowrap" style={{ left: '50%' }}>
          <span>3등급</span>
          {(() => {
            const cut = boundaries?.find(b => b.grade === 3)?.boundaryScore;
            return cut !== undefined && cut !== null ? (
              <span className="text-xs opacity-90 font-mono text-text-muted font-bold mt-0.5">{cut}점</span>
            ) : null;
          })()}
        </span>
        <span className="absolute text-center transform -translate-x-[50%] flex flex-col items-center leading-normal whitespace-nowrap" style={{ left: '78%' }}>
          <span>2등급</span>
          {(() => {
            const cut = boundaries?.find(b => b.grade === 2)?.boundaryScore;
            return cut !== undefined && cut !== null ? (
              <span className="text-xs opacity-90 font-mono text-text-muted font-bold mt-0.5">{cut}점</span>
            ) : null;
          })()}
        </span>
        <span className="absolute text-center transform -translate-x-[50%] flex flex-col items-center leading-normal whitespace-nowrap" style={{ left: '95%' }}>
          <span>1등급</span>
          {(() => {
            const cut = boundaries?.find(b => b.grade === 1)?.boundaryScore;
            return cut !== undefined && cut !== null ? (
              <span className="text-xs opacity-90 font-mono text-text-muted font-bold mt-0.5">{cut}점</span>
            ) : null;
          })()}
        </span>
      </div>
    </div>
  );
}

export function DashboardScreen({ classes, student, classNum, onChangeStudent, onReset }: DashboardScreenProps) {
  const [avgMode, setAvgMode] = useState<'weighted' | 'simple'>('weighted');
  const [showRank, setShowRank] = useState<boolean>(true);
  const [rankCriteria, setRankCriteria] = useState<'sum' | 'weighted' | 'simple'>('sum');
  const [sortState, setSortState] = useState<{ col: string | null; dir: 'asc'|'desc' }>({ col: null, dir: 'asc' });
  
  const allStudentsFlat = useMemo(() => classes.flatMap(c => c.students.map(s => ({ ...s, classNumber: c.classNumber, className: c.className }))), [classes]);
  const schoolWide = useMemo(() => aggregateSchoolWide(classes), [classes]);
  const N = schoolWide?.studentCount || 130;
  
  const analyzed = useMemo(() => {
    if (!schoolWide) return null;
    return analyzeStudent(student, schoolWide.subjectScores, N);
  }, [student, schoolWide, N]);

  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (analyzed) {
      analyzed.subjectAnalysis.forEach(x => { if (x.grade !== null) s.add(x.subject); });
    }
    return s;
  });

  const handleSubjectToggle = (subj: string) => {
    const next = new Set(selectedSubjects);
    if (next.has(subj)) next.delete(subj);
    else next.add(subj);
    setSelectedSubjects(next);
  };

  const setPreset = (preset: 'all' | 'none' | 'stem' | 'humanities') => {
    if (!analyzed) return;
    const next = new Set<string>();
    const valid = analyzed.subjectAnalysis.filter(x => x.grade !== null);
    
    if (preset === 'all') {
      valid.forEach(x => next.add(x.subject));
    } else if (preset === 'stem') {
      valid.forEach(x => {
        const name = x.subject.toLowerCase();
        if (name.includes('국어') || name.includes('수학') || name.includes('영어') || name.includes('과학') || name.includes('물리') || name.includes('화학') || name.includes('생명') || name.includes('지구')) {
          next.add(x.subject);
        }
      });
    } else if (preset === 'humanities') {
      valid.forEach(x => {
        const name = x.subject.toLowerCase();
        if (name.includes('국어') || name.includes('수학') || name.includes('영어') || name.includes('사회') || name.includes('역사') || name.includes('한국사') || name.includes('지리') || name.includes('정치') || name.includes('경제')) {
          next.add(x.subject);
        }
      });
    }
    // 'none' leaves the set empty
    setSelectedSubjects(next);
  };

  if (!analyzed) return null;

  const validGrades = analyzed.subjectAnalysis.filter(x => x.grade !== null);
  const selectedGrades = validGrades.filter(x => selectedSubjects.has(x.subject));
  const weightedAvg = computeAvgGrade(validGrades, 'weighted');
  const simpleAvg = computeAvgGrade(validGrades, 'simple');
  const customWeightedAvg = computeAvgGrade(selectedGrades, 'weighted');
  const customSimpleAvg = computeAvgGrade(selectedGrades, 'simple');

  const allSums = allStudentsFlat.map(s => s.합계).filter(v => v !== null) as number[];
  const overallRank = student.합계 !== null ? getRank(student.합계, allSums) : null;
  const percentile = overallRank ? getPercentile(overallRank, N) : null;

  const allStudentAverages = useMemo(() => {
    if (!schoolWide) return { weighted: [], simple: [] };
    const w: number[] = [];
    const s: number[] = [];
    allStudentsFlat.forEach(st => {
      const a = analyzeStudent(st, schoolWide.subjectScores, N);
      const valid = a.subjectAnalysis.filter(x => x.grade !== null);
      const gw = computeAvgGrade(valid, 'weighted');
      const gs = computeAvgGrade(valid, 'simple');
      if (gw !== null) w.push(gw);
      if (gs !== null) s.push(gs);
    });
    return { weighted: w, simple: s };
  }, [allStudentsFlat, schoolWide, N]);

  const getGradeRank = (grade: number | null, grades: number[]) => {
    if (grade === null || grade === undefined) return null;
    return grades.filter(g => g !== null && !isNaN(g) && g < grade).length + 1;
  };

  const weightedAvgRank = weightedAvg !== null ? getGradeRank(weightedAvg, allStudentAverages.weighted) : null;
  const simpleAvgRank = simpleAvg !== null ? getGradeRank(simpleAvg, allStudentAverages.simple) : null;
  const currentRank = rankCriteria === 'sum' ? overallRank : (rankCriteria === 'weighted' ? weightedAvgRank : simpleAvgRank);
  const currentRankLabel = rankCriteria === 'sum' ? '전교 합계 성적 기준' : (rankCriteria === 'weighted' ? '가중 평균 등급 기준' : '단순 평균 등급 기준');
  const currentPercentile = currentRank ? getPercentile(currentRank, N) : null;

  const sortedTable = [...analyzed.subjectAnalysis].sort((a, b) => {
    if (!sortState.col) return 0;
    const { col, dir } = sortState;
    const aVal = (a as any)[col];
    const bVal = (b as any)[col];
    if (aVal === bVal) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    const comp = aVal > bVal ? 1 : -1;
    return dir === 'asc' ? comp : -comp;
  });

  const toggleSort = (col: string) => {
    setSortState(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="flex min-h-screen lg:grid font-sans bg-bg print:block" style={{ gridTemplateColumns: 'minmax(220px, 250px) 1fr' }}>
      {/* Sidebar for Desktop Only */}
      <aside className="hidden lg:flex print:hidden flex-col gap-5 border-r border-divider bg-surface px-4 py-5 sticky top-0 h-screen overflow-y-auto shadow-sm select-none">
        <div className="flex items-center gap-2 border-b border-divider pb-4 text-sm font-black text-primary dark:text-accent">
          <FileSpreadsheet className="h-5 w-5" />
          <span>1차 시험 분석</span>
        </div>
        
        {/* Class Selection Buttons */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-faint">학급 선택</span>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${classes.length}, minmax(0, 1fr))` }}>
            {classes.map(cls => (
              <button
                key={cls.classNumber}
                className={`py-1.5 rounded-lg text-center text-xs font-bold transition-all border ${
                  classNum === cls.classNumber
                    ? 'bg-primary border-primary text-white shadow-xs'
                    : 'bg-surface text-text-muted border-border hover:border-primary/50 hover:bg-primary-light hover:text-primary dark:hover:bg-primary-light/15'
                }`}
                onClick={() => {
                  const firstStudent = cls.students[0];
                  if(firstStudent) onChangeStudent(firstStudent, cls.classNumber);
                }}
              >
                {cls.className}
              </button>
            ))}
          </div>
        </div>

        {/* Student Selector Dropdown */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-text-faint" htmlFor="sidebar-student-select">
            학생 선택
          </label>
          <div className="relative">
            <select
              id="sidebar-student-select"
              className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2.5 pr-8 text-xs font-semibold text-text focus:border-primary focus:outline-hidden"
              value={`${student.학번}_${student.성명}`}
              onChange={(e) => {
                const val = e.target.value;
                const found = allStudentsFlat.find(s => `${s.학번}_${s.성명}` === val);
                if(found && found.classNumber) onChangeStudent(found, found.classNumber);
              }}
            >
              {classes.find(c => c.classNumber === classNum)?.students.sort((a,b)=>a.번호-b.번호).map(s => (
                <option key={`${s.학번}_${s.성명}`} value={`${s.학번}_${s.성명}`}>
                  {s.번호}번 {s.성명}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-faint">
              <ChevronRight className="h-4 w-4 rotate-90" />
            </div>
          </div>
        </div>

        {/* Global Utilities */}
        <div className="mt-auto flex flex-col gap-1.5 border-t border-divider pt-4">
          <button className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-xs font-bold text-text-muted transition hover:bg-surface-offset hover:text-text" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            <span>엑셀 파일 재업로드</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto bg-bg p-4 lg:p-7 print:p-0 print:overflow-visible">
        <div className="mx-auto flex max-w-[960px] flex-col gap-6">
          
          {/* Mobile Selectors Widget - Hidden on Large Screens & Print */}
          <div className="block lg:hidden rounded-2xl border border-border bg-surface p-4.5 shadow-xs print:hidden">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-divider pb-2.5">
                <span className="text-sm font-black text-primary  flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  <span>학급 / 학생 선택</span>
                </span>
                <div className="flex gap-1.5">
                  <button className="btn-icon !w-8 !h-8 !rounded-lg border border-border bg-surface-2" onClick={onReset} aria-label="파일 초기화">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-text-faint block mb-1">반</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text focus:outline-hidden"
                      value={classNum}
                      onChange={(e) => {
                        const cNum = parseInt(e.target.value);
                        const cls = classes.find(c => c.classNumber === cNum);
                        if (cls && cls.students[0]) onChangeStudent(cls.students[0], cNum);
                      }}
                    >
                      {classes.map(cls => (
                        <option key={cls.classNumber} value={cls.classNumber}>{cls.className}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-text-faint">
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-text-faint block mb-1">학생</label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text focus:outline-hidden"
                      value={`${student.학번}_${student.성명}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        const found = allStudentsFlat.find(s => `${s.학번}_${s.성명}` === val);
                        if (found && found.classNumber) onChangeStudent(found, found.classNumber);
                      }}
                    >
                      {classes.find(c => c.classNumber === classNum)?.students.sort((a,b)=>a.번호-b.번호).map(s => (
                        <option key={`${s.학번}_${s.성명}`} value={`${s.학번}_${s.성명}`}>
                          {s.번호}번 {s.성명}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-text-faint">
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Header Card with Premium Layout */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-800 dark:bg-slate-900 p-6 text-white shadow-sm lg:p-8 print:bg-transparent print:text-black print:border print:border-slate-300 print:shadow-none print:p-5 print:rounded-2xl select-none">
            {/* Ambient background glow (hidden on print) */}
            <div className="absolute right-0 top-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none print:hidden animate-pulse" />
            
            <div className="flex flex-wrap items-center justify-between gap-6 relative z-10 print:flex-nowrap print:gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner border border-white/10">
                  {/* 학교 마크 제거 후 단순 기하학 동그라미 심볼 */}
                  <div className="w-4 h-4 rounded-full bg-primary dark:bg-accent opacity-80" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight print:text-xl">{student.성명}</h1>
                    <span className="rounded-lg bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-tight print:bg-slate-100 print:border print:border-slate-200 print:text-slate-800">
                      1학년 {classNum}반 {student.번호}번
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-80 print:opacity-100 print:text-slate-500 font-semibold font-mono print:text-[10px]">
                    학번: 1{String(classNum).padStart(1, '0')}{String(student.번호).padStart(2, '0')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-left sm:text-right print:gap-4">
                <div className="border-l-0 sm:border-l border-white/20 sm:pl-6 print:border-l print:border-slate-200 print:pl-5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/70 mb-1 print:text-slate-500">
                    이수단위 가중 평균등급
                  </div>
                  <div className="text-3xl lg:text-4xl font-extrabold leading-none tabular-nums font-mono tracking-tight print:text-2xl">
                    {weightedAvg ?? '-'} <span className="text-sm font-normal opacity-70 print:text-xs">등급</span>
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold select-none print:bg-slate-100 print:border print:border-slate-200 print:text-slate-800 print:mt-1">
                    <Sparkles className="h-3 w-3 print:hidden" />
                     단순 평균 {simpleAvg ?? '-'}등급
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Row */}
          <div className="flex flex-wrap items-center justify-start gap-6 select-none print:hidden bg-surface-2/30 px-5 py-3 rounded-xl border border-divider shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-text-faint">석차 기준</span>
              <select
                className="appearance-none rounded-lg border border-border bg-surface px-3 py-1.5 pr-8 text-xs font-bold text-text shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer hover:border-black/30 dark:hover:border-white/30 transition-colors"
                value={rankCriteria}
                onChange={(e) => setRankCriteria(e.target.value as any)}
              >
                <option value="sum">단순 합계</option>
                <option value="weighted">가중 평균 등급</option>
                <option value="simple">단순 평균 등급</option>
              </select>
            </div>
            <div className="w-[1px] h-4 bg-border hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-text-faint">석차 표시</span>
              <button
                onClick={() => setShowRank(!showRank)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-hidden ${showRank ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showRank ? 'translate-x-[0.45rem]' : '-translate-x-[0.45rem]'}`} />
              </button>
            </div>
          </div>

          {/* Quick Summary Panels */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 select-none print:grid-cols-4 print:gap-2">
            {/* Core Box 1 */}
            {showRank ? (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xs transition hover:shadow-md print:p-3 print:shadow-none print:rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint print:text-[9px]">학과 석차</div>
                    <div className="mt-2 text-2xl lg:text-3xl font-black tabular-nums font-mono text-primary dark:text-accent print:text-lg print:mt-1">
                      {currentRank ?? '-'} <span className="text-sm font-semibold text-text-muted font-sans print:text-[10px]">/ {N}명</span>
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light/50 text-primary dark:bg-primary-light/10 dark:text-accent print:hidden">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-text-faint font-semibold print:mt-1 print:text-[8px]">{currentRankLabel}</div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-divider bg-surface-2 p-5 shadow-xs print:p-3 print:shadow-none print:rounded-xl opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint print:text-[9px]">학과 석차</div>
                    <div className="mt-2 text-xl font-bold font-sans text-text-muted print:text-sm print:mt-1">
                      비공개
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-text-muted print:hidden">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-text-muted font-semibold print:mt-1 print:text-[8px]">표시 안함</div>
              </div>
            )}

            {/* Core Box 2 */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xs transition hover:shadow-md print:p-3 print:shadow-none print:rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint print:text-[9px]">평균 등급</div>
                  <div className="mt-2 text-2xl lg:text-3xl font-black tabular-nums font-mono text-primary dark:text-accent print:text-lg print:mt-1">
                    {weightedAvg ?? '-'}
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light/50 text-primary dark:bg-primary-light/10 dark:text-accent print:hidden">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-text-faint font-semibold print:mt-1 print:text-[8px]">이수 가중 반영 값</div>
            </div>

            {/* Core Box 3 */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xs transition hover:shadow-md print:p-3 print:shadow-none print:rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint print:text-[9px]">단순 평균</div>
                  <div className="mt-2 text-2xl lg:text-3xl font-black tabular-nums font-mono text-primary dark:text-accent print:text-lg print:mt-1">
                    {simpleAvg ?? '-'}
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light/50 text-primary dark:bg-primary-light/10 dark:text-accent print:hidden">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-text-faint font-semibold print:mt-1 print:text-[8px]">산술 단순 평균 값</div>
            </div>

            {/* Core Box 4 */}
            {showRank ? (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-xs transition hover:shadow-md print:p-3 print:shadow-none print:rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint print:text-[9px]">상위 백분위</div>
                    <div className="mt-2 text-2xl lg:text-3xl font-black tabular-nums font-mono text-primary dark:text-accent print:text-lg print:mt-1">
                      {currentPercentile ? `${currentPercentile}%` : '-'}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light/50 text-primary dark:bg-primary-light/10 dark:text-accent print:hidden">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-text-faint font-semibold font-sans print:mt-1 print:text-[8px]">{currentRankLabel}</div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-divider bg-surface-2 p-5 shadow-xs print:p-3 print:shadow-none print:rounded-xl opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-faint print:text-[9px]">상위 백분위</div>
                    <div className="mt-2 text-xl font-bold font-sans text-text-muted print:text-sm print:mt-1">
                      비공개
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-text-muted print:hidden">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-text-muted font-semibold print:mt-1 print:text-[8px]">표시 안함</div>
              </div>
            )}
          </div>

          {/* Simulation and Radar Side-by-Side Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch print:grid-cols-1 print:gap-0">
            {/* Average Calculator Panel with Subject Selector Presets */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs lg:px-6 select-none flex flex-col justify-between print:hidden">
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-text">선택 과목별 가상 등급 시뮬레이션</h3>
                    <p className="text-[10px] text-text-faint font-semibold mt-0.5">과목 선택 별 등급 산출을 바로 모니터링할 수 있습니다.</p>
                  </div>
                  
                  <div className="flex gap-1.5 text-xs">
                    <button
                      className={`flex flex-col items-center justify-center rounded-[18px] border px-3 py-1 text-[11px] font-black transition-all leading-[1.2] ${avgMode === 'weighted' ? 'border-primary bg-primary text-white print:bg-surface-offset print:text-text print:border-border' : 'border-border bg-surface-offset text-text-muted hover:text-text'}`}
                      onClick={() => setAvgMode('weighted')}
                    >
                      <span>이수단위</span>
                      <span>가중반영</span>
                    </button>
                    <button
                      className={`flex flex-col items-center justify-center rounded-[18px] border px-3 py-1 text-[11px] font-black transition-all leading-[1.2] ${avgMode === 'simple' ? 'border-primary bg-primary text-white print:bg-surface-offset print:text-text print:border-border' : 'border-border bg-surface-offset text-text-muted hover:text-text'}`}
                      onClick={() => setAvgMode('simple')}
                    >
                      <span>과목</span>
                      <span>단순평균</span>
                    </button>
                  </div>
                </div>

                {/* Quick Presets Menu */}
                <div className="mb-3.5 flex flex-wrap gap-1.5 items-center bg-surface-2/70 p-2 rounded-xl border border-border/40">
                  <span className="text-[10px] font-black text-text-faint px-1.5">선택 단축 필터:</span>
                  <button
                    className="rounded-lg bg-surface hover:bg-surface-offset text-text-muted hover:text-text px-2 py-1 text-[10px] font-bold border border-border/80 transition"
                    onClick={() => setPreset('all')}
                  >
                    전체 선택
                  </button>
                  <button
                    className="rounded-lg bg-surface hover:bg-surface-offset text-text-muted hover:text-text px-2 py-1 text-[10px] font-bold border border-border/80 transition"
                    onClick={() => setPreset('none')}
                  >
                    전체 해제
                  </button>
                  <button
                    className="rounded-lg bg-surface hover:bg-surface-offset text-text-muted hover:text-text px-2 py-1 text-[10px] font-bold border border-border/80 transition"
                    onClick={() => setPreset('stem')}
                  >
                    국·수·영·과
                  </button>
                  <button
                    className="rounded-lg bg-surface hover:bg-surface-offset text-text-muted hover:text-text px-2 py-1 text-[10px] font-bold border border-border/80 transition"
                    onClick={() => setPreset('humanities')}
                  >
                    국·수·영·사·한
                  </button>
                </div>

                {/* Selectable Subject Pills */}
                <div className="mb-5 flex flex-wrap gap-2">
                  {validGrades.map(s => {
                    const isActive = selectedSubjects.has(s.subject);
                    return (
                      <button
                        key={s.subject}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                          isActive 
                            ? 'border-primary bg-primary-light text-primary dark:bg-primary-light/10 dark:text-accent' 
                            : 'border-border bg-surface text-text-muted hover:border-text-faint'
                        }`}
                        onClick={() => handleSubjectToggle(s.subject)}
                      >
                        <span className={`w-2 h-2 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-primary dark:bg-accent scale-110' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        <span>{formatSubjectName(s.subject)}</span>
                        <span className="opacity-60 text-[10px]">({s.grade}등급)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulated Dual Comparison Output Card */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-offset/60 p-4 border border-border/40">
                 <div>
                   <div className="text-[10px] font-extrabold text-text-muted uppercase">전체과목 가중치 평균</div>
                   <div className="mt-1 tabular-nums font-mono text-2xl lg:text-3xl font-black text-text">
                     {avgMode === 'weighted' ? (weightedAvg ?? '-') : (simpleAvg ?? '-')} <span className="text-xs font-sans font-medium text-text-faint">등급</span>
                   </div>
                   <div className="text-[10px] text-text-faint mt-1 font-semibold">
                     {validGrades.length}개 과목 종합 기준
                   </div>
                 </div>
                 
                 <div className="border-l border-divider/70 pl-4 lg:pl-6">
                   <div className="text-[10px] font-extrabold text-primary dark:text-accent uppercase">자가선택 조합 평균</div>
                   <div className={`mt-1 tabular-nums font-mono text-2xl lg:text-3xl font-black ${selectedSubjects.size > 0 ? 'text-primary dark:text-accent' : 'text-text-faint'}`}>
                     {selectedSubjects.size > 0 ? (avgMode === 'weighted' ? (customWeightedAvg ?? '-') : (customSimpleAvg ?? '-')) : '-'} <span className="text-xs font-sans font-medium text-text-faint">등급</span>
                   </div>
                   <div className="text-[10px] text-text-faint mt-1 font-semibold">
                     {selectedSubjects.size}개 과목 조합 {avgMode === 'weighted' ? '(이수반영)' : '(단순평균)'}
                   </div>
                 </div>
              </div>
            </div>

            {/* Radar Analysis Section */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs lg:px-6 flex flex-col justify-between print:border-none print:shadow-none print:p-0 print:mx-auto print:max-w-md w-full avoid-page-break">
              <div className="print:text-center">
                <h3 className="text-sm font-black text-text print:text-base">과목별 종합 균형 분석</h3>
                <p className="text-[10px] text-text-faint font-semibold mt-0.5 print:text-xs">레이더 방사형 성취도로 전체적인 균형을 모니터링합니다.</p>
              </div>
              <div className="mt-5 max-w-lg mx-auto w-full flex-1 flex items-center justify-center print:mt-1 print:h-[260px] print:w-[260px]">
                <RadarChart subjectAnalysis={analyzed.subjectAnalysis} isDark={false} />
              </div>
            </div>
          </div>

          {/* Table Database Section */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs lg:px-6 mb-8 overflow-x-auto print:p-0 print:shadow-none print:border-none print:mb-0">
              <div className="mb-4 print:mb-2 print:border-b print:border-slate-200 print:pb-2">
               <h3 className="text-base font-black text-text print:text-lg animate-none">학기 과목 전체 데이터 그리드</h3>
               <p className="text-xs text-text-faint font-semibold mt-0.5 print:text-slate-500">각 과목별 원점수, 성취등급 및 백분위와 세부 수험생 학력 분포 분석 결과입니다.</p>
             </div>
             <table className="w-full min-w-[420px] border-collapse text-left font-sans">
               <thead>
                 <tr className="bg-surface-2/65">
                   {['subject', 'units', 'score', 'grade', ...(showRank ? ['schoolRank', 'percentile'] : [])].map((key) => {
                     const titles: Record<string, string> = {
                       subject: '과목명', units: '단위', score: '원점수', grade: '등급', schoolRank: '석차', percentile: '백분위'
                     };
                     return (
                       <th 
                         key={key}
                         className="cursor-pointer border-b border-divider px-3 py-3 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-text whitespace-nowrap"
                          onClick={() => toggleSort(key)}
                        >
                          <div className="flex items-center gap-1 select-none">
                            <span>{titles[key]}</span>
                            <span className={`text-[10px] not-italic ${sortState.col === key ? 'text-primary dark:text-accent font-black opacity-100' : 'opacity-35'}`}>
                              {sortState.col === key ? (sortState.dir === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((s, idx) => {
                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? 'bg-surface' : 'bg-slate-200/40 dark:bg-slate-900/60';
                    const isPageBreak = idx === 1;
                    return (
                      <React.Fragment key={s.subject}>
                        <tr className={`${rowBg} hover:bg-surface-2/60 transition-colors avoid-page-break ${isPageBreak ? 'print-page-break-before' : ''}`}>
                       <td className={`${s.score !== null ? 'pt-4 pb-2 border-b border-transparent' : 'py-4 border-b border-divider'} px-3 text-base font-black text-text`}>{formatSubjectName(s.subject)}</td>
                       <td className={`${s.score !== null ? 'pt-4 pb-2 border-b border-transparent' : 'py-4 border-b border-divider'} px-3 text-base text-text-muted font-bold font-mono`}>{s.units}</td>
                       <td className={`${s.score !== null ? 'pt-4 pb-2 border-b border-transparent' : 'py-4 border-b border-divider'} px-3 text-lg tabular-nums font-black font-mono text-primary`}>{s.score !== null ? <>{s.score}<span className="text-[11px] font-sans text-text-faint ml-0.5 align-baseline font-bold select-none">점</span></> : '-'}</td>
                       <td className={`${s.score !== null ? 'pt-4 pb-2 border-b border-transparent' : 'py-4 border-b border-divider'} px-3 text-lg tabular-nums font-mono`}>
                          <span className={`inline-flex items-center justify-center text-lg font-black whitespace-nowrap ${s.grade !== null ? `text-[var(--color-grade-${s.grade})]` : 'text-text-faint'} print:text-text`}>
                            {s.grade ? `${s.grade}등급` : '-'}
                          </span>
                        </td>
                       {showRank && (
                         <>
                           <td className={`${s.score !== null ? 'pt-4 pb-2 border-b border-transparent' : 'py-4 border-b border-divider'} px-3 text-lg tabular-nums font-black font-mono text-text`}>{s.schoolRank ?? '-'} <span className="opacity-50 text-sm font-sans font-bold">/ {N}</span></td>
                           <td className={`${s.score !== null ? 'pt-4 pb-2 border-b border-transparent' : 'py-4 border-b border-divider'} px-3 text-lg tabular-nums font-mono font-black text-text`}>{s.percentile !== null ? `${s.percentile}%` : '-'}</td>
                         </>
                       )}
                      </tr>
                     {s.score !== null && s.percentile !== null && showRank && (
                       <tr className={`${rowBg} hover:bg-surface-2/40 transition-colors avoid-page-break`}>
                         <td colSpan={showRank ? 6 : 4} className="border-b border-divider px-3 pt-0.5 pb-4">
                           <div className="w-full bg-surface rounded-2xl border border-divider p-4.5 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6 items-center">
                             <SubjectPositionBar 
                               percentile={s.percentile} 
                               score={s.score} 
                               grade={s.grade} 
                               schoolRank={s.schoolRank}
                               schoolN={s.schoolN ?? N}
                               boundaries={s.boundaries}
                              />
                             {/* Gap Analysis */}
                             <div className="flex flex-col md:border-l md:border-divider/50 md:pl-4">
                               {s.gap && s.grade && s.grade > 1 ? (
                                 <div className="w-full">
                                   <div className="text-xs text-text-faint font-bold mb-1 tracking-tight">다음 등급({s.grade - 1}등급) 격차</div>
                                   <div className="flex items-baseline gap-2">
                                     <span className="text-xl font-black text-primary dark:text-accent tabular-nums font-mono">+{s.gap.pointGap}점</span>
                                     <span className="text-sm font-semibold text-text-muted tracking-tight">(약 {s.gap.rankGap}명 필요)</span>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="w-full flex items-center gap-1.5 text-xs font-bold text-primary dark:text-accent min-h-8">
                                   {s.grade === 1 ? (
                                     <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg w-full">
                                       <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                       <span>현재 최고 등급 유지 중 🎉</span>
                                     </span>
                                   ) : (
                                     <span className="text-text-faint">격차 정보 없음</span>
                                   )}
                                 </div>
                               )}
                             </div>
                           </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 );
               })}

               </tbody>
             </table>
          </div>
          
          <div className="print-footer select-none">출력일자: {new Date().toLocaleDateString('ko-KR')} | 내신성적 분석 레포트 v2</div>
        </div>
      </main>

      {/* Floating Printing Floating Trigger Button */}
      <button 
        className="fixed bottom-6 right-6 z-[100] inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-black text-white shadow-lg transition-all hover:bg-primary-hover hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8 print:hidden" 
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        <span>리포트 인쇄</span>
      </button>
    </div>
  );
}
