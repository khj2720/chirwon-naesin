import React from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { SubjectAnalysis } from '../lib/grading';
import { formatSubjectName } from '../lib/utils';

interface RadarChartProps {
  subjectAnalysis: SubjectAnalysis[];
  isDark: boolean;
}

export function RadarChart({ subjectAnalysis, isDark }: RadarChartProps) {
  // Convert to 5-point inverted scale (1st Grade -> 5, 5th Grade -> 1, null -> 0)
  const data = subjectAnalysis.map(s => {
    const dName = formatSubjectName(s.subject);
    return {
      subject: s.subject,
      units: s.units,
      label: `${dName}\n(${s.units}단위)`,
      displayName: dName,
      gradeVal: s.grade === null ? 0 : (6 - s.grade), // 1 -> 5, 2 -> 4, etc.
      originalGrade: s.grade,
    };
  });

  const gridCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const textCol = isDark ? '#8890ab' : '#64748b';
  const fillCol = isDark ? 'rgba(91,127,212,0.25)' : 'rgba(56, 130, 246, 0.2)'; // #3b82f6 with 0.2 opacity
  const lineCol = isDark ? 'rgba(112,152,232,0.9)' : '#3b82f6';
  
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="55%" data={data}>
          <PolarGrid stroke={gridCol} gridType="polygon" />
          <PolarAngleAxis 
            dataKey="displayName" 
            tick={{ fill: isDark ? '#c8cce0' : '#1e293b', fontSize: 13, fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 'bold' }} 
          />
          <PolarRadiusAxis 
            angle={90}
            domain={[0, 5]} 
            tickCount={6} 
            axisLine={false}
            tick={false}
          />
          <Tooltip 
             formatter={(value: any, name: any, props: any) => {
               const g = props.payload.originalGrade;
               return [g ? `${g}등급` : '-', '등급'];
             }}
             contentStyle={{
               backgroundColor: isDark ? '#181b24' : '#fff',
               borderColor: isDark ? '#313754' : '#e2e8f0',
               color: isDark ? '#c8cce0' : '#1e293b',
               fontFamily: "'Noto Sans KR', sans-serif"
             }}
          />
          <Radar 
            name="등급" 
            dataKey="gradeVal" 
            stroke={lineCol} 
            fill={fillCol} 
            fillOpacity={1} 
            strokeWidth={2}
            dot={({ cx, cy, payload, index }) => {
              const grade = payload.originalGrade;
              if (!grade) return null;
              return (
                <g key={`dot-${index}`}>
                  <circle cx={cx} cy={cy} r={5} fill={lineCol} stroke={isDark ? '#1e293b' : '#fff'} strokeWidth={2} />
                </g>
              );
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
