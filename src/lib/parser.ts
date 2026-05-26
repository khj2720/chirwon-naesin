import * as XLSX from 'xlsx';
// dynamically imported in parseFile if needed

export interface SubjectHeader {
  short: string;
  full: string;
  units: number;
  colIndex: number;
}

export interface ScoreData {
  subject: string;
  full: string;
  units: number;
  score: number | null;
  rawVal: string;
}

export interface Student {
  번호: number;
  학번: string;
  성명: string;
  scores: ScoreData[];
  합계: number | null;
  평균: number | null;
  classNumber?: number;
  className?: string;
}

export interface ClassData {
  className: string;
  classNumber: number;
  homeroom: string;
  subjects: SubjectHeader[];
  students: Student[];
  schoolWideCount: number | null;
}

function parseSubjectHeader(str: string) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split(':');
  if (parts.length < 2) return null;
  const group = parts[0].trim();
  const rest = parts[1].trim();
  const m = rest.match(/\((\d+)\)$/);
  const subjectName = rest.replace(/\(\d+\)$/, '').trim();
  return { short: subjectName, full: str, units: m ? parseInt(m[1]) : 1 };
}

function parseScore(val: any) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || /[가-힣a-zA-Z]/.test(s)) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function findText(row: any[], text: string) {
  if (!row) return -1;
  for (let i = 0; i < row.length; i++) if (String(row[i] || '').includes(text)) return i;
  return -1;
}

export async function parseFile(buffer: ArrayBuffer, password?: string): Promise<ClassData[]> {
  let finalBuffer: any = buffer;

  if (password) {
    try {
      // @ts-ignore
      const XlsxPopulateModule = await import('xlsx-populate/browser/xlsx-populate');
      const XlsxPopulate = XlsxPopulateModule.default || XlsxPopulateModule;
      const workbook = await XlsxPopulate.fromDataAsync(buffer, { password });
      const decryptedOutput = await workbook.outputAsync();
      
      if (typeof Blob !== 'undefined' && decryptedOutput instanceof Blob) {
        finalBuffer = await decryptedOutput.arrayBuffer();
      } else {
        finalBuffer = decryptedOutput;
      }
    } catch (decryptErr: any) {
      console.error('Decryption failed:', decryptErr);
      throw new Error('올바르지 않은 암호이거나 파일 복호화에 실패했습니다. (Error: ' + decryptErr.message + ')');
    }
  }

  const wb = XLSX.read(finalBuffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const classes: ClassData[] = [];
  let i = 0;

  while (i < rows.length) {
    if (findText(rows[i], '지필평가 학급별 일람표') === -1) { i++; continue; }

    let classNumber: number | null = null;
    for (const c of (rows[i + 1] || [])) {
      const m = String(c || '').match(/(\d+)반/);
      if (m) { classNumber = parseInt(m[1]); break; }
    }

    let homeroom = '';
    for (const c of (rows[i + 2] || [])) {
      const m = String(c || '').match(/담임교사\s*:\s*\(([^)]+)\)/);
      if (m) { homeroom = m[1]; break; }
    }

    const subjectRow = rows[i + 3] || [];
    const subjects: SubjectHeader[] = [];
    let startCol = -1;
    for (let c = 0; c < subjectRow.length; c++) {
      const cell = String(subjectRow[c] || '').trim();
      if (cell.includes(':')) {
        const parsed = parseSubjectHeader(cell);
        if (parsed) { if (startCol === -1) startCol = c; subjects.push({ ...parsed, colIndex: c }); }
      }
    }
    if (!subjects.length || startCol === -1) { i++; continue; }

    const sumCol = subjects[subjects.length - 1].colIndex + 1;
    const avgCol = sumCol + 1;
    const students: Student[] = [];
    let swCount: number | null = null;
    let j = i + 5;

    while (j < rows.length) {
      const row = rows[j];
      const c0 = String(row[0] || '').trim();
      if (findText(row, '지필평가 학급별 일람표') !== -1) break;
      if (/^(응시생수|총|평)/.test(c0) && !c0.includes('학과')) { j++; continue; }
      if (c0.includes('학과응시생수')) {
        for (let ci = 0; ci < row.length; ci++) {
          const m = String(row[ci] || '').match(/(\d+)/);
          if (m) { swCount = parseInt(m[1]); break; }
        }
        j++; continue;
      }
      if (c0.includes('학과총점') || c0.includes('학과평균')) { j++; continue; }

      const num = parseInt(c0);
      if (isNaN(num) || num < 1 || num > 200) { j++; continue; }
      const 성명 = String(row[2] || '').trim();
      if (!성명) { j++; continue; }
      const 학번 = String(row[1] || '').trim().replace(/\.0$/, '');

      students.push({
        번호: num, 
        학번, 
        성명,
        scores: subjects.map(s => ({
          subject: s.short, full: s.full, units: s.units, /* colIndex omit */
          score: parseScore(row[s.colIndex]),
          rawVal: String(row[s.colIndex] || '').trim()
        })),
        합계: parseScore(row[sumCol]),
        평균: parseScore(row[avgCol])
      });
      j++;
    }

    if (subjects.length && students.length) {
      if(classNumber !== null) {
        classes.push({ className: classNumber + '반', classNumber, homeroom, subjects, students, schoolWideCount: swCount });
      }
    }
    i = j;
  }
  return classes;
}

export function aggregateSchoolWide(classes: ClassData[]) {
  if (!classes?.length) return null;
  const subjectScores: Record<string, number[]> = {};
  classes[0].subjects.forEach(s => { subjectScores[s.short] = []; });
  for (const cls of classes)
    for (const stu of cls.students)
      for (const sc of stu.scores)
        if (sc.score !== null) {
          if (!subjectScores[sc.subject]) subjectScores[sc.subject] = [];
          subjectScores[sc.subject].push(sc.score);
        }
  const count = classes[0].schoolWideCount || classes.reduce((a, c) => a + c.students.length, 0);
  return { subjectScores, studentCount: count };
}
