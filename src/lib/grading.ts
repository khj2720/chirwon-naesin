import { ScoreData, Student } from './parser';

export interface Boundary {
  grade: number;
  maxRank: number;
  boundaryScore?: number | null;
}

export function computeGrades(scores: number[], N: number): { boundaries: Boundary[], sorted: number[] } {
  const sorted = scores.filter(s => s !== null && !isNaN(s)).sort((a, b) => b - a);
  const boundaries: Boundary[] = [
    { grade: 1, maxRank: Math.floor(N * 0.10) },
    { grade: 2, maxRank: Math.floor(N * 0.34) },
    { grade: 3, maxRank: Math.floor(N * 0.66) },
    { grade: 4, maxRank: Math.floor(N * 0.90) },
    { grade: 5, maxRank: N }
  ];
  boundaries.forEach(b => {
    const idx = b.maxRank - 1;
    b.boundaryScore = (idx >= 0 && idx < sorted.length) ? sorted[idx] : null;
  });
  return { boundaries, sorted };
}

export function getRank(score: number | null, scores: number[]) {
  if (score === null || score === undefined) return null;
  return scores.filter(s => s !== null && !isNaN(s) && s > score).length + 1;
}

export function getGrade(rank: number | null, boundaries: Boundary[]) {
  if (rank === null) return null;
  for (const b of boundaries) if (rank <= b.maxRank) return b.grade;
  return 5;
}

export function getAchievement(score: number | null) {
  if (score === null) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

export function computeGapToNextGrade(score: number | null, rank: number | null, grade: number | null, boundaries: Boundary[]) {
  if (!grade || grade === 1 || score === null || rank === null) return null;
  const next = boundaries.find(b => b.grade === grade - 1);
  if (!next || next.boundaryScore === null || next.boundaryScore === undefined) return null;
  return {
    pointGap: Math.round(Math.max(0, next.boundaryScore - score) * 10) / 10,
    rankGap: Math.max(0, rank - next.maxRank)
  };
}

export function getPercentile(rank: number | null, total: number | null) {
  if (rank === null || !total) return null;
  return Math.round((1 - (rank - 1) / total) * 1000) / 10;
}

export interface SubjectAnalysis extends ScoreData {
  schoolRank: number | null;
  schoolN: number;
  grade: number | null;
  achieve: string | null;
  percentile: number | null;
  gap: { pointGap: number; rankGap: number } | null;
  boundaries: Boundary[];
}

export interface AnalyzedStudent extends Student {
  subjectAnalysis: SubjectAnalysis[];
}

export function analyzeStudent(student: Student, subjectScores: Record<string, number[]>, N: number): AnalyzedStudent {
  const subjectAnalysis = student.scores.map(sc => {
    if (sc.score === null) {
      return { 
        ...sc, 
        schoolRank: null, schoolN: N, grade: null, achieve: null, 
        gap: null, boundaries: [], percentile: null 
      };
    }
    const allSchool = subjectScores[sc.subject] || [];
    const { boundaries } = computeGrades(allSchool, N);
    const schoolRank = getRank(sc.score, allSchool);
    const grade = getGrade(schoolRank, boundaries);
    const achieve = getAchievement(sc.score);
    const percentile = getPercentile(schoolRank, N);
    return {
      ...sc,
      schoolRank, schoolN: N,
      grade, achieve, percentile,
      gap: computeGapToNextGrade(sc.score, schoolRank, grade, boundaries), boundaries
    };
  });
  return { ...student, subjectAnalysis };
}

export function computeAvgGrade(items: SubjectAnalysis[], mode: 'simple' | 'weighted') {
  const valid = items.filter(x => x.grade !== null);
  if (!valid.length) return null;
  if (mode === 'weighted') {
    const sumW = valid.reduce((a, x) => a + (x.units || 1), 0);
    const sumG = valid.reduce((a, x) => a + (x.grade as number) * (x.units || 1), 0);
    return sumW ? Math.round(sumG / sumW * 100) / 100 : null;
  }
  return Math.round(valid.reduce((a, x) => a + (x.grade as number), 0) / valid.length * 100) / 100;
}
