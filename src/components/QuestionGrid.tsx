import React from 'react';
import { cn } from '../lib/utils';
import { Subject } from '../types';

interface QuestionGridProps {
  questions: any[];
  responses: Record<string, string | null>;
  statuses: Record<string, 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked'>;
  currentQuestionIndex: number;
  onJump: (index: number) => void;
}

const QuestionGrid: React.FC<QuestionGridProps> = ({
  questions,
  statuses,
  currentQuestionIndex,
  onJump
}) => {
  const subjects: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-emerald-500 text-white border-emerald-500';
      case 'not_answered': return 'bg-red-500 text-white border-red-500';
      case 'marked': return 'bg-purple-600 text-white border-purple-600';
      case 'answered_marked': return 'bg-purple-600 text-white border-emerald-400 border-4';
      case 'not_visited': return 'bg-white text-slate-600 border-slate-200';
      default: return 'bg-white text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 gap-2 mb-6 text-[10px] font-bold uppercase tracking-tighter">
        <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-emerald-500 rounded-sm"></div><span>Answered</span></div>
        <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-red-500 rounded-sm"></div><span>Not Answered</span></div>
        <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-purple-600 rounded-sm"></div><span>Marked</span></div>
        <div className="flex items-center space-x-2"><div className="w-4 h-4 bg-white border border-slate-200 rounded-sm"></div><span>Not Visited</span></div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        {subjects.map(sub => {
          const subQuestions = questions.filter(q => q.subject === sub);
          if (subQuestions.length === 0) return null;

          return (
            <div key={sub}>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-100 pb-1">{sub}</h4>
              <div className="grid grid-cols-5 gap-2">
                {subQuestions.map((q) => {
                  const globalIndex = questions.findIndex(item => item.id === q.id);
                  const status = statuses[q.id] || 'not_visited';
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => onJump(globalIndex)}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border transition-all",
                        getStatusColor(status),
                        currentQuestionIndex === globalIndex && "ring-2 ring-blue-600 ring-offset-2"
                      )}
                    >
                      {q.display_number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionGrid;
