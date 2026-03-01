import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateExamId } from '../../lib/utils';
import { Subject, QuestionType } from '../../types';
import { toast } from 'react-hot-toast';
import { ChevronLeft, Plus, Trash2, Upload, Type, Image as ImageIcon, Save, CheckCircle } from 'lucide-react';

const CreateExam: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const [step, setStep] = useState(1);
  const [examId, setExamId] = useState('');
  const [dbExamId, setDbExamId] = useState('');
  const [examName, setExamName] = useState('');
  const [duration, setDuration] = useState(180);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeSubject, setActiveSubject] = useState<Subject>('Physics');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (editId) {
      loadExamData(editId);
    }
  }, [editId]);

  const loadExamData = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();

      if (examError) throw examError;

      setExamName(exam.name);
      setDuration(exam.duration_minutes);
      setPassword(exam.exam_password);
      setExamId(exam.exam_id);
      setDbExamId(exam.id);

      const { data: qs, error: qsError } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', id)
        .order('display_number', { ascending: true });

      if (qsError) throw qsError;
      setQuestions(qs || []);
    } catch (error: any) {
      toast.error('Error loading exam: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Question Form State
  const [qType, setQType] = useState<QuestionType>('text');
  const [qText, setQText] = useState('');
  const [qImage, setQImage] = useState<File | null>(null);
  const [options, setOptions] = useState({
    A: { type: 'text' as QuestionType, value: '', file: null as File | null },
    B: { type: 'text' as QuestionType, value: '', file: null as File | null },
    C: { type: 'text' as QuestionType, value: '', file: null as File | null },
    D: { type: 'text' as QuestionType, value: '', file: null as File | null },
  });
  const [correctAnswer, setCorrectAnswer] = useState('A');

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (dbExamId) {
      // Update existing
      const { error } = await supabase.from('exams').update({
        name: examName,
        duration_minutes: duration,
        exam_password: password,
      }).eq('id', dbExamId);

      if (error) {
        toast.error('Error updating exam: ' + error.message);
        return;
      }
      setStep(2);
      toast.success('Exam details updated.');
    } else {
      // Create new
      const newExamId = generateExamId();
      
      const { data, error } = await supabase.from('exams').insert({
        name: examName,
        duration_minutes: duration,
        exam_id: newExamId,
        exam_password: password,
        status: 'draft'
      }).select().single();

      if (error) {
        toast.error('Error creating exam: ' + error.message);
        return;
      }

      if (!data) {
        toast.error('Failed to retrieve created exam data');
        return;
      }

      setExamId(newExamId);
      setDbExamId(data.id);
      setStep(2);
      toast.success('Exam setup complete. Now add questions.');
    }
  };

  const uploadToSupabase = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('exam-images')
      .upload(`${examId}/${path}`, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('exam-images')
      .getPublicUrl(data.path);
    
    return publicUrl;
  };

  const handleAddQuestion = async () => {
    setIsUploading(true);
    try {
      let qImageUrl = null;
      if (qType === 'image' && qImage) {
        qImageUrl = await uploadToSupabase(qImage, `q_${Date.now()}.jpg`);
      }

      const optionValues = { ...options };
      for (const key of ['A', 'B', 'C', 'D'] as const) {
        if (optionValues[key].type === 'image' && optionValues[key].file) {
          optionValues[key].value = await uploadToSupabase(optionValues[key].file!, `opt_${key}_${Date.now()}.jpg`);
        }
      }

      const displayNum = questions.length + 1;
      const newQuestion = {
        exam_id: dbExamId,
        display_number: displayNum,
        subject: activeSubject,
        question_type: qType,
        question_text: qType === 'text' ? qText : null,
        question_image_url: qImageUrl,
        option_a_type: optionValues.A.type,
        option_a_value: optionValues.A.value,
        option_b_type: optionValues.B.type,
        option_b_value: optionValues.B.value,
        option_c_type: optionValues.C.type,
        option_c_value: optionValues.C.value,
        option_d_type: optionValues.D.type,
        option_d_value: optionValues.D.value,
        correct_answer: correctAnswer
      };

      const { error } = await supabase.from('questions').insert(newQuestion);
      if (error) throw error;

      setQuestions([...questions, { ...newQuestion, id: Date.now().toString() }]);
      toast.success('Question added');
      
      // Reset Form
      setQText('');
      setQImage(null);
      setOptions({
        A: { type: 'text', value: '', file: null },
        B: { type: 'text', value: '', file: null },
        C: { type: 'text', value: '', file: null },
        D: { type: 'text', value: '', file: null },
      });
    } catch (error: any) {
      toast.error('Error adding question: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleActivateExam = async () => {
    if (questions.length === 0) {
      toast.error('Add at least one question first');
      return;
    }

    const counts = {
      physics_count: questions.filter(q => q.subject === 'Physics').length,
      chemistry_count: questions.filter(q => q.subject === 'Chemistry').length,
      botany_count: questions.filter(q => q.subject === 'Botany').length,
      zoology_count: questions.filter(q => q.subject === 'Zoology').length,
      total_questions: questions.length
    };

    const { error } = await supabase
      .from('exams')
      .update({ 
        status: 'active',
        ...counts
      })
      .eq('id', dbExamId);

    if (error) {
      toast.error('Error activating exam: ' + error.message);
    } else {
      toast.success('Exam is now LIVE!');
      navigate('/admin/manage');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast.error('Error deleting question');
    } else {
      setQuestions(questions.filter(q => q.id !== id));
      toast.success('Question deleted');
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  if (step === 1) {
    return (
      <div className="min-h-screen p-8 max-w-2xl mx-auto">
        <button onClick={() => navigate('/admin/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-8">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
        </button>
        
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold mb-6">{dbExamId ? 'Edit Exam' : 'Create New Exam'}</h1>
          <form onSubmit={handleCreateExam} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exam Name</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Mock Test 01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Duration (Minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exam Password (for students)</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Set a password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              {dbExamId ? 'Save & Continue' : 'Next: Add Questions'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">{examName}</h1>
          <p className="text-slate-500">Exam ID: <span className="font-mono font-bold text-blue-600">{examId}</span> (Share this with students)</p>
        </div>
        <button 
          onClick={handleActivateExam}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 flex items-center space-x-2"
        >
          <CheckCircle className="w-5 h-5" />
          <span>{questions.length > 0 ? 'Update & Activate' : 'Activate Exam'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Question Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex space-x-2 mb-6 border-b border-slate-100 pb-4">
              {(['Physics', 'Chemistry', 'Botany', 'Zoology'] as Subject[]).map(sub => (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubject === sub ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              {/* Question Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Question Content</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setQType('text')} className={`p-1.5 rounded-md ${qType === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><Type className="w-4 h-4" /></button>
                    <button onClick={() => setQType('image')} className={`p-1.5 rounded-md ${qType === 'image' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><ImageIcon className="w-4 h-4" /></button>
                  </div>
                </div>
                {qType === 'text' ? (
                  <textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg h-24 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your question here..."
                  />
                ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                    <input type="file" onChange={(e) => setQImage(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">{qImage ? qImage.name : 'Click to upload question image'}</p>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['A', 'B', 'C', 'D'] as const).map(key => (
                  <div key={key} className="p-4 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-400">Option {key}</span>
                      <div className="flex bg-slate-100 p-1 rounded-lg scale-90">
                        <button onClick={() => setOptions({...options, [key]: {...options[key], type: 'text'}})} className={`p-1 rounded-md ${options[key].type === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><Type className="w-4 h-4" /></button>
                        <button onClick={() => setOptions({...options, [key]: {...options[key], type: 'image'}})} className={`p-1 rounded-md ${options[key].type === 'image' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}><ImageIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {options[key].type === 'text' ? (
                      <input
                        type="text"
                        value={options[key].value}
                        onChange={(e) => setOptions({...options, [key]: {...options[key], value: e.target.value}})}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder={`Option ${key} text`}
                      />
                    ) : (
                      <input 
                        type="file" 
                        onChange={(e) => setOptions({...options, [key]: {...options[key], file: e.target.files?.[0] || null}})}
                        className="text-xs text-slate-500" 
                        accept="image/*" 
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Correct Answer */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Correct Answer</label>
                <div className="flex space-x-4">
                  {['A', 'B', 'C', 'D'].map(val => (
                    <label key={val} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="correct"
                        value={val}
                        checked={correctAnswer === val}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">{val}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddQuestion}
                disabled={isUploading}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Add Question to {activeSubject}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Question List / Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold mb-4">Exam Summary</h3>
            <div className="space-y-3">
              {['Physics', 'Chemistry', 'Botany', 'Zoology'].map(sub => (
                <div key={sub} className="flex justify-between text-sm">
                  <span className="text-slate-500">{sub}</span>
                  <span className="font-bold">{questions.filter(q => q.subject === sub).length}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 flex justify-between font-bold">
                <span>Total Questions</span>
                <span className="text-blue-600">{questions.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-h-[500px] overflow-y-auto">
            <h3 className="font-bold mb-4">Added Questions</h3>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    <span className="text-xs font-medium text-slate-600">{q.subject}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">No questions added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateExam;
