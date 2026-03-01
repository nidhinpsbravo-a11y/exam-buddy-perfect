import React, { forwardRef } from 'react';
import { Result, Question, Subject } from '../types';
import { format } from 'date-fns';
import { getPerformanceLabel, cn } from '../lib/utils';

interface ReportCardProps {
  result: Result;
  examName: string;
  questions: Question[];
}

const ReportCard = forwardRef<HTMLDivElement, ReportCardProps>(({ result, examName, questions }, ref) => {
  const subjects = Array.from(new Set(questions.map(q => q.subject))) as Subject[];
  
  return (
    <div ref={ref} className="p-10 bg-white text-slate-900 w-[800px] mx-auto border border-slate-200 shadow-xl">
      <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
        <h1 className="text-3xl font-bold uppercase tracking-widest mb-2">EXAM BUDDY Report Card</h1>
        <p className="text-slate-500 font-medium">{examName}</p>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div className="space-y-4">
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Student Details</p>
            <p className="text-xl font-bold">{result.student_name}</p>
            <p className="text-sm font-mono text-slate-500">Roll: {result.roll_number}</p>
          </div>
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Exam Date</p>
            <p className="font-medium">{format(new Date(result.evaluated_at), 'PPP')}</p>
          </div>
        </div>
        <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-center items-center">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Overall Score</p>
          <p className="text-4xl font-black">{result.total_score}</p>
          <p className="text-xs opacity-60">out of {result.max_score}</p>
          <div className="mt-4 px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold">
            {result.percentage.toFixed(1)}% AGGREGATE
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Subject Performance</h3>
        <div className="grid grid-cols-4 gap-4">
          {subjects.map(sub => {
            const score = (result as any)[`${sub.toLowerCase()}_score`];
            const maxSubScore = questions.filter(q => q.subject === sub).length * 4;
            const subPercentage = maxSubScore > 0 ? (score / maxSubScore) * 100 : 0;
            const perf = getPerformanceLabel(subPercentage);
            
            return (
              <div key={sub} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{sub}</p>
                <p className="text-xl font-bold mb-1">{score}</p>
                <div className={cn("text-[8px] font-bold flex items-center", perf.color)}>
                  <span className="mr-1">{perf.icon}</span>
                  {perf.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Analysis</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 border border-emerald-100 bg-emerald-50 rounded-lg">
              <p className="text-[8px] font-bold text-emerald-600 uppercase">Correct</p>
              <p className="text-sm font-bold text-emerald-700">{result.correct_count}</p>
            </div>
            <div className="p-2 border border-red-100 bg-red-50 rounded-lg">
              <p className="text-[8px] font-bold text-red-600 uppercase">Wrong</p>
              <p className="text-sm font-bold text-red-700">{result.wrong_count}</p>
            </div>
            <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg">
              <p className="text-[8px] font-bold text-slate-400 uppercase">Skipped</p>
              <p className="text-sm font-bold text-slate-500">{result.unattempted_count}</p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Key Insights</h3>
          <div className="space-y-2">
            {result.percentage >= 75 && <p className="text-[10px] text-emerald-700 font-medium">• Excellent conceptual clarity across subjects.</p>}
            {result.wrong_count > result.correct_count / 2 && <p className="text-[10px] text-red-700 font-medium">• High negative marking. Focus on accuracy over speed.</p>}
            {result.unattempted_count > questions.length / 4 && <p className="text-[10px] text-amber-700 font-medium">• Many questions left unattempted. Improve time management.</p>}
            <p className="text-[10px] text-slate-600 font-medium">• Consistent performance in {[...subjects].sort((a, b) => (result as any)[`${b.toLowerCase()}_score`] - (result as any)[`${a.toLowerCase()}_score`])[0]}.</p>
          </div>
        </div>
      </div>

      <div className="mt-20 flex justify-between items-end border-t border-slate-100 pt-8">
        <div className="text-center">
          <div className="w-32 border-b border-slate-900 mb-2"></div>
          <p className="text-[10px] font-bold uppercase text-slate-400">Student Signature</p>
        </div>
        <div className="text-center">
          <div className="w-32 border-b border-slate-900 mb-2"></div>
          <p className="text-[10px] font-bold uppercase text-slate-400">Teacher Signature</p>
        </div>
      </div>
    </div>
  );
});

export default ReportCard;
