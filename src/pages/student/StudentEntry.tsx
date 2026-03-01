import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStudent } from '../../context/StudentContext';
import { toast } from 'react-hot-toast';
import { User, Hash, Lock, Key, ChevronRight, ChevronLeft } from 'lucide-react';

const StudentEntry: React.FC = () => {
  const navigate = useNavigate();
  const { setExam, setSession } = useStudent();
  const [formData, setFormData] = useState({
    examId: '',
    password: '',
    name: '',
    rollNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Find Exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('exam_id', formData.examId.toUpperCase())
        .eq('exam_password', formData.password)
        .single();

      if (examError || !exam) {
        toast.error('Invalid Exam ID or Password');
        setLoading(false);
        return;
      }

      if (exam.status === 'closed') {
        toast.error('This exam is no longer accepting entries');
        setLoading(false);
        return;
      }

      if (exam.status === 'draft') {
        toast.error('This exam has not been activated yet');
        setLoading(false);
        return;
      }

      // 2. Check for existing session
      const { data: existingSession, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('exam_id', exam.id)
        .eq('roll_number', formData.rollNumber)
        .single();

      if (existingSession) {
        if (existingSession.status === 'submitted') {
          toast.error('You have already submitted this exam.');
          setLoading(false);
          return;
        }
        // Resume session
        setExam(exam);
        setSession(existingSession);
        toast.success('Resuming your exam session');
        navigate('/student/preview');
        return;
      }

      // 3. Create new session
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          exam_id: exam.id,
          student_name: formData.name,
          roll_number: formData.rollNumber,
          status: 'in_progress',
          responses: {},
          time_per_question: {}
        })
        .select()
        .single();

      if (createError) throw createError;

      setExam(exam);
      setSession(newSession);
      navigate('/student/preview');

    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute left-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
          title="Back to Home"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Student Login</h1>
          <p className="text-slate-500">Enter your details to begin the exam</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Exam ID</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.examId}
                  onChange={(e) => setFormData({...formData, examId: e.target.value.toUpperCase()})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Roll Number</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : (
              <>
                <span>Enter Exam</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentEntry;
