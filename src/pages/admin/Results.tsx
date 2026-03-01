import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Exam, Session, Question, Result, Subject } from '../../types';
import { calculateScore, getPerformanceLabel, getTimeStatus, cn, formatTime } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { 
  ChevronLeft, Download, BarChart2, Users, Trophy, Search, 
  Clock, CheckCircle, XCircle, AlertCircle, TrendingUp, 
  Target, Lightbulb, Filter, ChevronDown, ChevronUp,
  Zap, Timer, FileText
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReportCard from '../../components/ReportCard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const Results: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('examId') || '');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Filter state for question table
  const [qFilter, setQFilter] = useState<'all' | 'correct' | 'wrong' | 'skipped' | 'marked'>('all');
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'questions'>('overview');

  const [activeSubTab, setActiveSubTab] = useState<string>('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (questions.length > 0 && !activeSubTab) {
      setActiveSubTab(questions[0].subject);
    }
  }, [questions]);

  useEffect(() => {
    const fetchExams = async () => {
      const { data } = await supabase.from('exams').select('*').in('status', ['active', 'closed']);
      setExams(data || []);
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchData();
    }
  }, [selectedExamId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: sessData } = await supabase.from('sessions').select('*').eq('exam_id', selectedExamId);
    setSessions(sessData || []);

    const { data: resData } = await supabase.from('results').select('*').eq('exam_id', selectedExamId).order('total_score', { ascending: false });
    setResults(resData || []);
    
    const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', selectedExamId).order('display_number', { ascending: true });
    setQuestions(qData || []);
    
    setLoading(false);
  };

  const handleEvaluate = async () => {
    if (sessions.length === 0) {
      toast.error('No student sessions found for this exam');
      return;
    }

    setEvaluating(true);
    try {
      const { data: qData, error: qError } = await supabase.from('questions').select('*').eq('exam_id', selectedExamId);
      if (qError) throw qError;
      const examQuestions = qData as Question[];

      if (examQuestions.length === 0) {
        toast.error('No questions found for this exam');
        return;
      }

      const evaluationResults: any[] = [];
      for (const session of sessions) {
        if (session.status !== 'submitted') continue;

        let totalScore = 0;
        let correctCount = 0;
        let wrongCount = 0;
        let unattemptedCount = 0;
        const subjectScores = { Physics: 0, Chemistry: 0, Botany: 0, Zoology: 0 };
        const perQuestionResult: any = {};

        examQuestions.forEach(q => {
          const response = session.responses[q.id] || null;
          const marks = calculateScore(response, q.correct_answer!);
          
          if (marks === 4) correctCount++;
          else if (marks === -1) wrongCount++;
          else unattemptedCount++;

          totalScore += marks;
          subjectScores[q.subject] += marks;
          
          perQuestionResult[q.id] = {
            response,
            correct: q.correct_answer,
            marks,
            time_spent: session.time_per_question[q.id] || 0
          };
        });

        evaluationResults.push({
          session_id: session.id,
          exam_id: selectedExamId,
          student_name: session.student_name,
          roll_number: session.roll_number,
          total_score: totalScore,
          max_score: examQuestions.length * 4,
          percentage: (totalScore / (examQuestions.length * 4)) * 100,
          correct_count: correctCount,
          wrong_count: wrongCount,
          unattempted_count: unattemptedCount,
          physics_score: subjectScores.Physics,
          chemistry_score: subjectScores.Chemistry,
          botany_score: subjectScores.Botany,
          zoology_score: subjectScores.Zoology,
          per_question_result: perQuestionResult,
          evaluated_at: new Date().toISOString()
        });
      }

      if (evaluationResults.length === 0) {
        toast.error('No submitted sessions to evaluate');
        return;
      }

      const { error: resError } = await supabase.from('results').upsert(evaluationResults, { onConflict: 'session_id' });
      if (resError) throw resError;

      toast.success(`Evaluation complete! ${evaluationResults.length} results processed.`);
      fetchData();
    } catch (error: any) {
      toast.error('Evaluation failed: ' + error.message);
    } finally {
      setEvaluating(false);
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !pdfContainerRef.current) {
      toast.error('Report card not ready');
      return;
    }
    
    const loadingToast = toast.loading('Generating PDF...');
    try {
      const container = pdfContainerRef.current;
      const el = reportRef.current;
      
      // Make container visible for capture but keep it off-screen
      container.style.display = 'block';
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.zIndex = '-9999';
      container.style.visibility = 'visible';
      
      const canvas = await html2canvas(el, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 850 // Ensure consistent width for capture
      });
      
      // Reset styles
      container.style.display = 'none';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Handle multi-page if needed, but for report card usually one page is enough
      // If pdfHeight > pageHeight, we might need to loop, but let's keep it simple for now
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Report_${selectedResult?.student_name}_${selectedResult?.roll_number}.pdf`);
      toast.success('PDF Downloaded', { id: loadingToast });
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Failed to generate PDF', { id: loadingToast });
    }
  };

  const viewReport = (result: Result) => {
    setSelectedResult(result);
  };

  // Analysis Data for Selected Result
  const analysis = useMemo(() => {
    if (!selectedResult) return null;
    
    const perQuestionResult = selectedResult.per_question_result || {};
    const subjects = Array.from(new Set(questions.map(q => q.subject))) as Subject[];
    const subData = subjects.map(sub => {
      const score = (selectedResult as any)[`${sub.toLowerCase()}_score`] || 0;
      const subQuestions = questions.filter(q => q.subject === sub);
      const maxSubScore = subQuestions.length * 4;
      const percentage = maxSubScore > 0 ? (score / maxSubScore) * 100 : 0;
      
      const correct = subQuestions.filter(q => perQuestionResult[q.id]?.marks === 4).length;
      const wrong = subQuestions.filter(q => perQuestionResult[q.id]?.marks === -1).length;
      const skipped = subQuestions.length - correct - wrong;
      const time = subQuestions.reduce((acc, q) => acc + (perQuestionResult[q.id]?.time_spent || 0), 0);

      return {
        subject: sub,
        score,
        percentage,
        correct,
        wrong,
        skipped,
        time,
        perf: getPerformanceLabel(percentage)
      };
    });

    let totalTime = 0;
    Object.values(perQuestionResult).forEach((r: any) => {
      totalTime += (r.time_spent || 0);
    });
    const avgTime = questions.length > 0 ? totalTime / questions.length : 0;
    
    const slowQs = questions.filter(q => {
      const res = perQuestionResult[q.id];
      return res && res.time_spent > 300;
    }).map(q => ({ ...q, result: perQuestionResult[q.id] }));
    
    const rushedQs = questions.filter(q => {
      const res = perQuestionResult[q.id];
      return res && res.time_spent < 60 && res.response;
    }).map(q => ({ ...q, result: perQuestionResult[q.id] }));

    const rank = results.findIndex(r => r.id === selectedResult.id) + 1;
    const percentile = results.length > 1 ? ((results.length - rank) / (results.length - 1)) * 100 : 100;

    return { subData, totalTime, avgTime, slowQs, rushedQs, rank, percentile };
  }, [selectedResult, questions, results]);

  const filteredQuestions = useMemo(() => {
    if (!selectedResult) return [];
    const perQuestionResult = selectedResult.per_question_result || {};
    return questions.filter(q => {
      const res = perQuestionResult[q.id];
      if (qFilter === 'correct') return res?.marks === 4;
      if (qFilter === 'wrong') return res?.marks === -1;
      if (qFilter === 'skipped') return !res?.response;
      return true;
    });
  }, [selectedResult, questions, qFilter]);

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto bg-slate-50">
      <button onClick={() => navigate('/admin/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-8 transition-colors">
        <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Exam Results & Analysis</h1>
          <p className="text-slate-500">Detailed performance insights and student evaluation.</p>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto">
          <select 
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          >
            <option value="">Select an Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button
            onClick={handleEvaluate}
            disabled={!selectedExamId || evaluating}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center space-x-2 shadow-lg shadow-blue-100"
          >
            {evaluating ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <BarChart2 className="w-4 h-4" />}
            <span>Evaluate All</span>
          </button>
        </div>
      </div>

      {!selectedExamId ? (
        <div className="bg-white p-20 rounded-3xl border border-slate-200 text-center shadow-sm">
          <Search className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-400">No Exam Selected</h2>
          <p className="text-slate-400">Please select an exam from the dropdown to view results.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Leaderboard */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold">Leaderboard</h3>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase">{results.length} Students</span>
              </div>
              <div className="max-h-[800px] overflow-y-auto">
                {results.map((res, idx) => (
                  <button 
                    key={res.id}
                    onClick={() => viewReport(res)}
                    className={cn(
                      "w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50",
                      selectedResult?.id === res.id && "bg-blue-50 border-blue-100"
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <span className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0 ? "bg-amber-100 text-amber-700" : 
                        idx === 1 ? "bg-slate-200 text-slate-700" :
                        idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                      )}>
                        {idx + 1}
                      </span>
                      <div className="text-left">
                        <p className="font-bold text-sm">{res.student_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{res.roll_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-600">{res.total_score}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{res.percentage.toFixed(1)}%</p>
                    </div>
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-sm">No results yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Analysis */}
          <div className="lg:col-span-8 space-y-8">
            {!selectedResult ? (
              <div className="bg-white p-20 rounded-3xl border border-slate-200 text-center shadow-sm h-full flex flex-col justify-center items-center">
                <TrendingUp className="w-16 h-16 text-slate-100 mb-4" />
                <h2 className="text-xl font-bold text-slate-300">Select a student to view analysis</h2>
              </div>
            ) : (
              <>
                {analysis && (
                  <>
                    {/* Section 1: Overall Performance */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Score</p>
                    <p className="text-3xl font-black text-blue-600">{selectedResult.total_score}<span className="text-sm text-slate-300 font-normal">/{selectedResult.max_score}</span></p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{selectedResult.percentage.toFixed(1)}% Aggregate</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Rank</p>
                    <p className="text-3xl font-black text-slate-900">#{analysis.rank}<span className="text-sm text-slate-300 font-normal">/{results.length}</span></p>
                    <p className="text-xs text-emerald-600 mt-1 font-bold">Top {Math.max(1, 100 - analysis.percentile).toFixed(0)}%</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Time Taken</p>
                    <p className="text-3xl font-black text-slate-900">{formatTime(analysis.totalTime)}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Avg: {(analysis.avgTime / 60).toFixed(1)}m / question</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Accuracy</p>
                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <span className="text-emerald-600">✓ {selectedResult.correct_count}</span>
                      <span className="text-red-500">✗ {selectedResult.wrong_count}</span>
                      <span className="text-slate-400">⊝ {selectedResult.unattempted_count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${questions.length > 0 ? (selectedResult.correct_count / questions.length) * 100 : 0}%` }}></div>
                      <div className="bg-red-500 h-full" style={{ width: `${questions.length > 0 ? (selectedResult.wrong_count / questions.length) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-2xl w-fit">
                  {[
                    { id: 'overview', label: 'Performance Overview', icon: BarChart2 },
                    { id: 'time', label: 'Time Analysis', icon: Timer },
                    { id: 'questions', label: 'Question Drill-down', icon: Filter }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === tab.id 
                          ? "bg-white text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && (
                  <>
                    {/* Section 2: Subject-wise Breakdown */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold mb-6 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-blue-600" /> Subject-wise Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.subData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} unit="%" />
                              <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Bar dataKey="percentage" radius={[4, 4, 0, 0]} barSize={40}>
                                {analysis.subData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : entry.percentage >= 60 ? '#3b82f6' : '#f59e0b'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                          {analysis.subData.map(sub => (
                            <div key={sub.subject} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm">{sub.subject}</span>
                                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full bg-white shadow-sm", sub.perf.color)}>
                                  {sub.perf.icon} {sub.perf.label}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-2xl font-black">{sub.score}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">Score</p>
                                </div>
                                <div className="text-right text-[10px] font-bold text-slate-500 space-x-2">
                                  <span className="text-emerald-600">✓ {sub.correct}</span>
                                  <span className="text-red-500">✗ {sub.wrong}</span>
                                  <span className="text-slate-400">⊝ {sub.skipped}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Section 6: Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="text-emerald-600 font-bold mb-4 flex items-center uppercase text-xs tracking-widest"><Target className="w-4 h-4 mr-2" /> Strengths</h4>
                        <div className="space-y-3">
                          {analysis.subData.filter(s => s.percentage >= 75).map(s => (
                            <div key={s.subject} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs font-bold text-emerald-700">
                              {s.subject} ({s.percentage.toFixed(0)}%)
                            </div>
                          ))}
                          {analysis.subData.filter(s => s.percentage >= 75).length === 0 && <p className="text-xs text-slate-400 italic">No major strengths identified yet.</p>}
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="text-red-600 font-bold mb-4 flex items-center uppercase text-xs tracking-widest"><AlertCircle className="w-4 h-4 mr-2" /> Weaknesses</h4>
                        <div className="space-y-3">
                          {analysis.subData.filter(s => s.percentage < 60).map(s => (
                            <div key={s.subject} className="p-3 bg-red-50 rounded-xl border border-red-100 text-xs font-bold text-red-700">
                              {s.subject} ({s.percentage.toFixed(0)}%)
                            </div>
                          ))}
                          {analysis.subData.filter(s => s.percentage < 60).length === 0 && <p className="text-xs text-slate-400 italic">No critical weaknesses found!</p>}
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="text-blue-600 font-bold mb-4 flex items-center uppercase text-xs tracking-widest"><Lightbulb className="w-4 h-4 mr-2" /> Recommendations</h4>
                        <div className="space-y-2 text-[10px] text-slate-600 font-medium">
                          <p>• Focus on {[...analysis.subData].sort((a, b) => a.percentage - b.percentage)[0]?.subject || 'weakest'} concepts.</p>
                          <p>• Balance time across sections to improve overall pace.</p>
                          <p>• Practice 50+ MCQs daily for your weakest subjects.</p>
                          <p>• Review all {selectedResult.wrong_count} wrong answers today.</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'time' && (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center"><Timer className="w-5 h-5 mr-2 text-blue-600" /> Time Analysis</h3>
                    
                    {/* Heatmap Grid */}
                    <div className="mb-8">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-4">Time Heatmap (Pace per Question)</p>
                      <div className="flex flex-wrap gap-2">
                        {questions.map(q => {
                          const time = selectedResult.per_question_result[q.id]?.time_spent || 0;
                          const status = getTimeStatus(time);
                          return (
                            <div 
                              key={q.id} 
                              title={`Q${q.display_number}: ${time}s`}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold text-white",
                                status === 'too_slow' ? "bg-red-500" : status === 'slightly_slow' ? "bg-amber-500" : "bg-emerald-500"
                              )}
                            >
                              {q.display_number}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex space-x-4 text-[10px] font-bold text-slate-400 uppercase">
                        <div className="flex items-center"><div className="w-3 h-3 bg-emerald-500 rounded-sm mr-1"></div> Good Pace</div>
                        <div className="flex items-center"><div className="w-3 h-3 bg-amber-500 rounded-sm mr-1"></div> Slightly Slow</div>
                        <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div> Too Slow</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-bold text-red-600 mb-4 flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> Slow Questions (&gt;5 min)</h4>
                        <div className="space-y-2">
                          {analysis.slowQs.slice(0, 5).map(q => (
                            <div key={q.id} className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                              <div className="text-xs">
                                <span className="font-bold">Q{q.display_number}</span>
                                <span className="text-slate-500 ml-2">{q.subject}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-xs font-bold text-red-700">{Math.floor(q.result.time_spent / 60)}m {q.result.time_spent % 60}s</span>
                                {q.result.marks === 4 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                              </div>
                            </div>
                          ))}
                          {analysis.slowQs.length === 0 && <p className="text-xs text-slate-400 italic">No slow questions detected. Great pace!</p>}
                        </div>
                        {analysis.slowQs.length > 0 && (
                          <p className="mt-4 text-xs text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                            <Lightbulb className="w-3 h-3 inline mr-1" />
                            AI Insight: Wasted {Math.floor(analysis.slowQs.reduce((acc, q) => acc + q.result.time_spent, 0) / 60)} minutes on {analysis.slowQs.length} questions.
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-600 mb-4 flex items-center"><Zap className="w-4 h-4 mr-2" /> Rushed Questions (&lt;1 min)</h4>
                        <div className="space-y-2">
                          {analysis.rushedQs.slice(0, 5).map(q => (
                            <div key={q.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                              <div className="text-xs">
                                <span className="font-bold">Q{q.display_number}</span>
                                <span className="text-slate-500 ml-2">{q.subject}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="text-xs font-bold text-blue-700">{q.result.time_spent}s</span>
                                {q.result.marks === 4 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                              </div>
                            </div>
                          ))}
                          {analysis.rushedQs.length === 0 && <p className="text-xs text-slate-400 italic">No rushed questions detected.</p>}
                        </div>
                      </div>
                    </div>

                    {/* Full Time Breakdown Table */}
                    <div className="mt-12">
                      <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center uppercase tracking-wider"><Clock className="w-4 h-4 mr-2 text-blue-600" /> Full Time Breakdown</h4>
                      <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 uppercase font-bold border-b border-slate-100">
                              <th className="px-4 py-3">Q#</th>
                              <th className="px-4 py-3">Subject</th>
                              <th className="px-4 py-3">Time Spent</th>
                              <th className="px-4 py-3">Pace</th>
                              <th className="px-4 py-3">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {questions.map(q => {
                              const res = selectedResult.per_question_result[q.id];
                              const time = res?.time_spent || 0;
                              const status = getTimeStatus(time);
                              return (
                                <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 font-bold">Q{q.display_number}</td>
                                  <td className="px-4 py-3 text-slate-500">{q.subject}</td>
                                  <td className="px-4 py-3 font-mono">{time}s</td>
                                  <td className="px-4 py-3">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                      status === 'too_slow' ? "bg-red-100 text-red-700" : 
                                      status === 'slightly_slow' ? "bg-amber-100 text-amber-700" : 
                                      "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {status.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {res?.marks === 4 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : 
                                     res?.marks === -1 ? <XCircle className="w-4 h-4 text-red-500" /> : 
                                     <span className="text-slate-300">⊝</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'questions' && (
                  <div className="space-y-6">
                    {/* Subject Navigation for Questions */}
                    <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                      {(Array.from(new Set(questions.map(q => q.subject))) as Subject[]).map(sub => {
                        const subQs = questions.filter(q => q.subject === sub);
                        if (subQs.length === 0) return null;
                        return (
                          <button
                            key={sub}
                            onClick={() => {
                              setActiveSubTab(sub);
                              setSelectedQuestionId(null);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center space-x-2",
                              activeSubTab === sub 
                                ? "bg-slate-900 text-white shadow-md" 
                                : "text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            <span>{sub}</span>
                            <span className="opacity-50 text-[10px] bg-white/10 px-1.5 rounded-md">{subQs.length}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Grid of Boxes (Sidebar) */}
                      <div className={cn(
                        "bg-white p-5 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 lg:sticky lg:top-8",
                        selectedQuestionId ? "lg:col-span-3" : "lg:col-span-12"
                      )}>
                        <div className="flex flex-col mb-6">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Matrix: {activeSubTab}</h3>
                          <div className="flex items-center space-x-3 text-[9px] font-bold text-slate-400 uppercase">
                            <div className="flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div> Fast</div>
                            <div className="flex items-center"><div className="w-2 h-2 bg-amber-500 rounded-full mr-1"></div> Mid</div>
                            <div className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div> Slow</div>
                          </div>
                        </div>

                        <div className={cn(
                          "grid gap-2",
                          selectedQuestionId ? "grid-cols-4 sm:grid-cols-6 lg:grid-cols-4" : "grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12"
                        )}>
                          {questions.filter(q => q.subject === activeSubTab).map(q => {
                            const res = selectedResult.per_question_result[q.id];
                            const time = res?.time_spent || 0;
                            const status = getTimeStatus(time);
                            const isSelected = selectedQuestionId === q.id;

                            return (
                              <button
                                key={q.id}
                                onClick={() => setSelectedQuestionId(isSelected ? null : q.id)}
                                className={cn(
                                  "aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative group",
                                  status === 'too_slow' ? "bg-red-500" : status === 'slightly_slow' ? "bg-amber-500" : "bg-emerald-500",
                                  isSelected ? "ring-2 ring-blue-600 ring-offset-1 scale-110 z-10" : "hover:scale-105 shadow-sm",
                                  !res?.response && "opacity-30 grayscale-[0.8]"
                                )}
                              >
                                <span className="text-[10px] font-black text-white">{q.display_number}</span>
                                
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                                  {time}s | {res?.response || 'Skipped'}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Question Detail Panel (Main Area) */}
                      {selectedQuestionId ? (
                        <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                          {(() => {
                            const q = questions.find(q => q.id === selectedQuestionId);
                            const res = selectedResult.per_question_result[selectedQuestionId];
                            if (!q) return null;
                            
                            return (
                              <>
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                  <div className="flex items-center space-x-4">
                                    <div className={cn(
                                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg",
                                      getTimeStatus(res?.time_spent || 0) === 'too_slow' ? "bg-red-500 shadow-red-100" : 
                                      getTimeStatus(res?.time_spent || 0) === 'slightly_slow' ? "bg-amber-500 shadow-amber-100" : 
                                      "bg-emerald-500 shadow-emerald-100"
                                    )}>
                                      {q.display_number}
                                    </div>
                                    <div>
                                      <h4 className="text-xl font-black text-slate-900">Question Analysis</h4>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{q.subject} Section</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="text-right mr-4">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Taken</p>
                                      <p className="text-lg font-black text-slate-900 flex items-center justify-end">
                                        <Timer className="w-4 h-4 mr-1 text-blue-500" />
                                        {res?.time_spent || 0}s
                                      </p>
                                    </div>
                                    <button 
                                      onClick={() => setSelectedQuestionId(null)}
                                      className="p-3 hover:bg-slate-200 rounded-2xl transition-colors"
                                    >
                                      <XCircle className="w-6 h-6 text-slate-400" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="p-8 space-y-8 overflow-y-auto max-h-[700px]">
                                  <div className="space-y-4">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                      <FileText className="w-4 h-4 mr-2" /> Question Statement
                                    </h5>
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-lg text-slate-800 leading-relaxed font-medium">
                                      {q.question_type === 'text' ? (
                                        <p>{q.question_text}</p>
                                      ) : (
                                        <div className="flex justify-center">
                                          <img src={q.question_image_url || ''} alt="Question" className="max-w-full rounded-2xl shadow-xl border-4 border-white" />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center mb-4">
                                        <Target className="w-4 h-4 mr-2" /> Options & Evaluation
                                      </h5>
                                    </div>
                                    {['A', 'B', 'C', 'D'].map(opt => {
                                      const isCorrect = q.correct_answer === opt;
                                      const isSelected = res?.response === opt;
                                      return (
                                        <div key={opt} className={cn(
                                          "p-5 rounded-3xl border-2 flex items-center justify-between transition-all duration-300",
                                          isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" :
                                          isSelected ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-slate-100 text-slate-600"
                                        )}>
                                          <div className="flex items-center space-x-4">
                                            <span className={cn(
                                              "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm",
                                              isCorrect ? "bg-emerald-500 text-white" : 
                                              isSelected ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                              {opt}
                                            </span>
                                            <span className="text-sm font-bold">{(q as any)[`option_${opt.toLowerCase()}_value`]}</span>
                                          </div>
                                          <div className="flex items-center">
                                            {isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                            {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Student Response</p>
                                      <p className={cn(
                                        "text-2xl font-black",
                                        res?.marks === 4 ? "text-emerald-600" : res?.marks === -1 ? "text-red-600" : "text-slate-400"
                                      )}>
                                        {res?.response || 'NOT ATTEMPTED'}
                                      </p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Correct Answer</p>
                                      <p className="text-2xl font-black text-emerald-600">{q.correct_answer}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Score Impact</p>
                                      <p className={cn(
                                        "text-2xl font-black",
                                        res?.marks === 4 ? "text-emerald-600" : res?.marks === -1 ? "text-red-600" : "text-slate-400"
                                      )}>
                                        {res?.marks > 0 ? `+${res.marks}` : res?.marks || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="lg:col-span-12 bg-white p-20 rounded-3xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <Target className="w-10 h-10 text-slate-200" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-400">Select a question from the matrix</h3>
                          <p className="text-slate-400 text-sm mt-2">Click any box on the left to view detailed analysis and time metrics.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Section 8: PDF Trigger */}
            <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-slate-200">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready for the official report?</h3>
                <p className="text-slate-400 text-sm">Download the comprehensive PDF report card for offline review.</p>
              </div>
              <button 
                onClick={downloadPDF}
                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download PDF Report</span>
              </button>
            </div>

            {/* Hidden Report Card for PDF generation */}
            <div 
              ref={pdfContainerRef}
              style={{ 
                display: 'none',
                position: 'absolute',
                left: '-9999px',
                top: 0
              }}
            >
              <ReportCard 
                ref={reportRef}
                result={selectedResult} 
                examName={exams.find(e => e.id === selectedExamId)?.name || ''} 
                questions={questions}
              />
            </div>
          </>
        )}
      </div>
        </div>
      )}
    </div>
  );
};

export default Results;
