import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import { supabase } from '../../lib/supabase';
import { formatTime, cn } from '../../lib/utils';
import QuestionGrid from '../../components/QuestionGrid';
import { toast } from 'react-hot-toast';
import { Clock, User, LogOut, ChevronLeft, ChevronRight, Save, RotateCcw, Flag, CheckCircle, Loader2 } from 'lucide-react';

type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked';

const ExamInterface: React.FC = () => {
  const navigate = useNavigate();
  const { exam, session, setSession } = useStudent();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | null>>({});
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  const [timePerQuestion, setTimePerQuestion] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // ✅ FIX: Keep a ref mirror of timePerQuestion so saveProgress always reads latest value
  const timePerQuestionRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!exam || !session) {
      navigate('/student');
      return;
    }

    const initExam = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, display_number, subject, question_type, question_text, question_image_url, option_a_type, option_a_value, option_b_type, option_b_value, option_c_type, option_c_value, option_d_type, option_d_value')
        .eq('exam_id', exam.id)
        .order('display_number', { ascending: true });

      if (error) {
        toast.error('Error loading questions');
        return;
      }

      setQuestions(data || []);
      
      if (data) {
        const imageUrls: string[] = [];
        data.forEach(q => {
          if (q.question_image_url) imageUrls.push(q.question_image_url);
          if (q.option_a_type === 'image') imageUrls.push(q.option_a_value);
          if (q.option_b_type === 'image') imageUrls.push(q.option_b_value);
          if (q.option_c_type === 'image') imageUrls.push(q.option_c_value);
          if (q.option_d_type === 'image') imageUrls.push(q.option_d_value);
        });
        imageUrls.forEach(url => {
          const img = new Image();
          img.src = url;
        });
      }
      
      setResponses(session.responses || {});

      // ✅ FIX: Load existing time data into BOTH state and ref
      const existingTime = session.time_per_question || {};
      setTimePerQuestion(existingTime);
      timePerQuestionRef.current = existingTime;
      
      const startTime = new Date(session.started_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const totalSeconds = exam.duration_minutes * 60;
      setTimeLeft(Math.max(0, totalSeconds - elapsedSeconds));

      const initialStatuses: Record<string, QuestionStatus> = {};
      data?.forEach(q => {
        if (session.responses?.[q.id]) {
          initialStatuses[q.id] = 'answered';
        } else {
          initialStatuses[q.id] = 'not_visited';
        }
      });
      setStatuses(initialStatuses);
      
      // ✅ FIX: Reset the question timer AFTER everything is loaded, not at mount
      questionStartTimeRef.current = Date.now();

      setLoading(false);
    };

    initExam();

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      toast('Leaving will not submit your exam. Your progress is saved.', { icon: '⚠️' });
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, isSubmitting]);

  // ✅ FIX: Auto-save no longer depends on timePerQuestion state (uses ref instead)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveProgress();
    }, 30000);
    return () => clearInterval(saveInterval);
  }, [responses]);

  const saveProgress = async (final = false) => {
    if (!session) return;

    const now = Date.now();
    const timeSpentOnCurrent = Math.floor((now - questionStartTimeRef.current) / 1000);

    // ✅ FIX: Read from ref (always current), not from React state (can be stale)
    const updatedTimePerQuestion = { ...timePerQuestionRef.current };

    // Get current question id from the questions array via a ref-safe approach
    const currentQId = (document.querySelector('[data-current-qid]') as HTMLElement)?.dataset?.currentQid;

    if (currentQId) {
      updatedTimePerQuestion[currentQId] = (updatedTimePerQuestion[currentQId] || 0) + timeSpentOnCurrent;
      
      // ✅ FIX: Reset the ref so we don't double-count on next save
      questionStartTimeRef.current = now;

      // ✅ FIX: Update BOTH the ref and React state so everything stays in sync
      timePerQuestionRef.current = updatedTimePerQuestion;
      setTimePerQuestion(updatedTimePerQuestion);
    }

    const updateData: any = {
      responses,
      time_per_question: updatedTimePerQuestion,
    };

    if (final) {
      updateData.status = 'submitted';
      updateData.submitted_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', session.id);

    if (error) console.error('Error saving progress:', error);
    else if (final) {
      setSession({ ...session, ...updateData });
    }
  };

  const handleAutoSubmit = async () => {
    toast.error('Time is up! Submitting your exam...');
    await handleSubmit(true);
  };

  const handleNext = () => {
    const currentQId = questions[currentIndex].id;
    
    if (!responses[currentQId] && statuses[currentQId] !== 'marked') {
      setStatuses(prev => ({ ...prev, [currentQId]: 'not_answered' }));
    }

    if (currentIndex < questions.length - 1) {
      updateTimeSpent();
      setCurrentIndex(prev => prev + 1);
    }
  };

  // ✅ FIX: handleSaveAndNext no longer calls saveProgress() — updateTimeSpent inside handleNext handles time correctly
  const handleSaveAndNext = () => {
    const currentQId = questions[currentIndex].id;
    if (responses[currentQId]) {
      setStatuses(prev => ({ ...prev, [currentQId]: 'answered' }));
    } else {
      setStatuses(prev => ({ ...prev, [currentQId]: 'not_answered' }));
    }
    handleNext();
  };

  const handleMarkForReview = () => {
    const currentQId = questions[currentIndex].id;
    if (responses[currentQId]) {
      setStatuses(prev => ({ ...prev, [currentQId]: 'answered_marked' }));
    } else {
      setStatuses(prev => ({ ...prev, [currentQId]: 'marked' }));
    }
    handleNext();
  };

  const handleClearResponse = () => {
    const currentQId = questions[currentIndex].id;
    setResponses(prev => {
      const next = { ...prev };
      delete next[currentQId];
      return next;
    });
    setStatuses(prev => ({ ...prev, [currentQId]: 'not_answered' }));
  };

  const updateTimeSpent = () => {
    const now = Date.now();
    const timeSpent = Math.floor((now - questionStartTimeRef.current) / 1000);
    const currentQId = questions[currentIndex].id;
    
    // ✅ FIX: Update BOTH ref and state together
    const updated = {
      ...timePerQuestionRef.current,
      [currentQId]: (timePerQuestionRef.current[currentQId] || 0) + timeSpent
    };
    timePerQuestionRef.current = updated;
    setTimePerQuestion(updated);

    questionStartTimeRef.current = now;
  };

  const handleJump = (index: number) => {
    updateTimeSpent();
    setCurrentIndex(index);
  };

  const handleSubmit = async (isAuto = false) => {
    setIsSubmitting(true);
    await saveProgress(true);
    navigate('/student/submitted');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const currentQuestion = questions[currentIndex];

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-2 flex justify-between items-center flex-shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-bold text-slate-800 truncate max-w-[300px]">{exam?.name}</h1>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center text-slate-500 text-sm">
            <User className="w-4 h-4 mr-2" />
            <span className="font-medium truncate max-w-[200px]">{session?.student_name} ({session?.roll_number})</span>
          </div>
        </div>
        
        <div className={cn(
          "px-4 py-1.5 rounded-xl font-mono font-bold text-lg flex items-center space-x-2 transition-colors",
          timeLeft < 300 ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50 text-blue-600"
        )}>
          <Clock className="w-4 h-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-1 flex space-x-1 flex-shrink-0 overflow-x-auto scrollbar-hide">
        {Array.from(new Set(questions.map(q => q.subject))).map(sub => {
          const isActive = currentQuestion.subject === sub;
          return (
            <button
              key={sub}
              onClick={() => {
                const firstIdx = questions.findIndex(q => q.subject === sub);
                if (firstIdx !== -1) handleJump(firstIdx);
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
              )}
            >
              {sub}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column (70%) */}
        {/* ✅ FIX: data-current-qid attribute lets saveProgress know which question is active */}
        <div
          className="w-[70%] flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden"
          data-current-qid={currentQuestion.id}
        >
          {/* Question Header */}
          <div className="px-6 py-2 flex items-center justify-between border-b border-slate-50 flex-shrink-0">
            <h2 className="text-base font-bold text-blue-600">Question {currentQuestion.display_number}</h2>
            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {currentQuestion.subject}
            </span>
          </div>

          {/* Question Content Box */}
          <div className="px-6 py-4 h-[45vh] overflow-y-auto flex-shrink-0 bg-white border-b border-slate-50">
            {currentQuestion.question_type === 'text' ? (
              <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">{currentQuestion.question_text}</p>
            ) : (
              <div className="flex items-start justify-center bg-slate-50 rounded-lg border border-slate-100 overflow-hidden p-2 w-full">
                <img 
                  key={`${currentQuestion.id}-main`}
                  src={currentQuestion.question_image_url || ''} 
                  alt="Question" 
                  className="w-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Options Grid (2x2) */}
          <div className="px-6 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const optType = currentQuestion[`option_${key.toLowerCase()}_type`];
                const optValue = currentQuestion[`option_${key.toLowerCase()}_value`];
                const isSelected = responses[currentQuestion.id] === key;

                return (
                  <button
                    key={key}
                    onClick={() => setResponses(prev => ({ ...prev, [currentQuestion.id]: key }))}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group overflow-hidden h-full",
                      isSelected 
                        ? "border-blue-600 bg-blue-50 shadow-sm" 
                        : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors",
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                    )}>
                      {key}
                    </div>

                    <div className="flex-1 flex items-center justify-center w-full px-2">
                      {optType === 'text' ? (
                        <span className="text-lg md:text-xl font-bold text-slate-800 text-center leading-tight">
                          {optValue}
                        </span>
                      ) : (
                        <img 
                          key={`${currentQuestion.id}-opt-${key}`}
                          src={optValue} 
                          alt={`Option ${key}`} 
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0 bg-white">
            <div className="flex space-x-3">
              <button
                onClick={handleMarkForReview}
                className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-bold border border-purple-100 hover:bg-purple-100 transition-all flex items-center"
              >
                <Flag className="w-4 h-4 mr-2" /> Mark for Review & Next
              </button>
              <button
                onClick={handleClearResponse}
                className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-bold border border-slate-100 hover:bg-slate-100 transition-all flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Clear Response
              </button>
            </div>
            
            <button
              onClick={handleSaveAndNext}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center shadow-md shadow-blue-100"
            >
              <span>Save & Next</span>
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>

        {/* Right Column (30%) */}
        <aside className="w-[30%] bg-slate-50 p-4 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <QuestionGrid
              questions={questions}
              responses={responses}
              statuses={statuses}
              currentQuestionIndex={currentIndex}
              onJump={handleJump}
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200 flex-shrink-0">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2 shadow-md shadow-emerald-50"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Submit Exam?</h2>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between p-3 bg-emerald-50 rounded-xl">
                <span className="text-emerald-700 font-medium">Answered</span>
                <span className="font-bold text-emerald-700">{Object.values(statuses).filter(s => s === 'answered' || s === 'answered_marked').length}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded-xl">
                <span className="text-red-700 font-medium">Not Answered</span>
                <span className="font-bold text-red-700">{Object.values(statuses).filter(s => s === 'not_answered' || s === 'marked').length}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-600 font-medium">Not Visited</span>
                <span className="font-bold text-slate-600">{questions.length - Object.keys(statuses).length}</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit()}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;
