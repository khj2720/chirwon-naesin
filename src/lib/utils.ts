import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const subjectNameMap: Record<string, string> = {
  '국어': '공통국어1',
  '수학': '공통수학1',
  '영어': '공통영어1',
  '통합사회': '통합사회1',
  '통합과학': '통합과학1',
  '한국사': '한국사1',
};

export function formatSubjectName(name: string) {
  return subjectNameMap[name] || name;
}
