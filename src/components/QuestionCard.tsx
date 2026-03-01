import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { QuestionType } from '../types';
import { Loader2 } from 'lucide-react';

interface QuestionCardProps {
  id: string;
  number: number;
  subject: string;
  type: QuestionType;
  text: string | null;
  imageUrl: string | null;
  options: {
    A: { type: QuestionType; value: string };
    B: { type: QuestionType; value: string };
    C: { type: QuestionType; value: string };
    D: { type: QuestionType; value: string };
  };
  selectedOption: string | null;
  onSelect: (option: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  number,
  subject,
  type,
  text,
  imageUrl,
  options,
  selectedOption,
  onSelect
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [optionImagesLoaded, setOptionImagesLoaded] = useState<Record<string, boolean>>({
    A: false, B: false, C: false, D: false
  });

  // Reset loading states when question changes
  useEffect(() => {
    setImageLoaded(false);
    setOptionImagesLoaded({ A: false, B: false, C: false, D: false });
  }, [id]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-blue-600">Question {number}</h2>
        <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider">
          {subject}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-4">
        <div className="mb-8 text-lg text-slate-800 leading-relaxed">
          {type === 'text' ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <div className="relative min-h-[100px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
              <img 
                key={`${id}-main`}
                src={imageUrl || ''} 
                alt="Question" 
                className={cn(
                  "max-w-full transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          {(['A', 'B', 'C', 'D'] as const).map((key) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={cn(
                "w-full flex items-center p-4 rounded-xl border-2 transition-all text-left group",
                selectedOption === key 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 transition-colors",
                selectedOption === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              )}>
                {key}
              </div>
              <div className="flex-1">
                {options[key].type === 'text' ? (
                  <span className="text-slate-700 font-medium">{options[key].value}</span>
                ) : (
                  <div className="relative min-h-[60px] flex items-center justify-start">
                    {!optionImagesLoaded[key] && (
                      <div className="absolute left-0 top-0 bottom-0 flex items-center">
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      </div>
                    )}
                    <img 
                      key={`${id}-opt-${key}`}
                      src={options[key].value} 
                      alt={`Option ${key}`} 
                      className={cn(
                        "max-h-32 rounded border border-slate-100 transition-opacity duration-300",
                        optionImagesLoaded[key] ? "opacity-100" : "opacity-0"
                      )}
                      onLoad={() => setOptionImagesLoaded(prev => ({ ...prev, [key]: true }))}
                    />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
