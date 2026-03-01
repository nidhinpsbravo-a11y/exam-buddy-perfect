import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Exam, Session } from '../../types';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  Trash2, 
  Edit3, 
  Eye, 
  XCircle, 
  ChevronLeft, 
  MoreVertical,
  Clock,
  FileText,
  Activity,
  RotateCcw,
  BarChart3,
  PlusCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageExams: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showLiveStatus, setShowLiveStatus] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchExams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) toast.error('Error fetching exams');
    else setExams(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? All questions, sessions, and results will be lost.')) return;
    
    const deletePromise = async () => {
      // Delete related records first in correct order
      // Use maybeSingle or just ignore errors for tables that might not have data
      await supabase.from('results').delete().eq('exam_id', id);
      await supabase.from('sessions').delete().eq('exam_id', id);
      await supabase.from('questions').delete().eq('exam_id', id);
      
      const { error: examError } = await supabase.from('exams').delete().eq('id', id);
      if (examError) throw examError;
      
      await fetchExams();
    };

    toast.promise(deletePromise(), {
      loading: 'Deleting exam and related data...',
      success: 'Exam deleted successfully',
      error: (err) => `Delete failed: ${err.message || 'Unknown error'}`
    });
  };

  const handleClose = async (id: string) => {
    if (!confirm('Close this exam? Students will no longer be able to submit.')) return;
    
    const closePromise = async () => {
      const { error } = await supabase
        .from('exams')
        .update({ status: 'closed' })
        .eq('id', id);

      if (error) throw error;
      await fetchExams();
    };

    toast.promise(closePromise(), {
      loading: 'Closing exam...',
      success: 'Exam closed successfully',
      error: (err) => `Failed to close exam: ${err.message}`
    });
  };

  const handleMoveToDraft = async (id: string) => {
    if (!confirm('Move this exam back to draft? Students will no longer be able to access it until it is activated again.')) return;
    
    const draftPromise = async () => {
      const { error } = await supabase
        .from('exams')
        .update({ status: 'draft' })
        .eq('id', id);

      if (error) throw error;
      await fetchExams();
    };

    toast.promise(draftPromise(), {
      loading: 'Moving to draft...',
      success: 'Exam moved to draft',
      error: (err) => `Failed to move to draft: ${err.message}`
    });
  };

  const viewLiveStatus = async (exam: Exam) => {
    setSelectedExam(exam);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('exam_id', exam.id);
    
    if (error) toast.error('Error fetching live status');
    else {
      setSessions(data || []);
      setShowLiveStatus(true);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <button onClick={() => navigate('/admin/dashboard')} className="flex items-center text-slate-500 hover:text-slate-800 mb-8">
        <ChevronLeft className="w-5 h-5 mr-1" /> Back to Dashboard
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Exams</h1>
        <button 
          onClick={() => navigate('/admin/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Create New Exam
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : exams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    exam.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    exam.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {exam.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{exam.exam_id}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{exam.name}</h3>
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2" /> {exam.duration_minutes} Minutes</div>
                  <div className="flex items-center"><FileText className="w-4 h-4 mr-2" /> {exam.total_questions} Questions</div>
                  <div className="text-xs pt-2">Created: {format(new Date(exam.created_at), 'PPP')}</div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                {exam.status === 'active' && (
                  <>
                    <button 
                      onClick={() => viewLiveStatus(exam)}
                      className="flex-1 min-w-[80px] flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Activity className="w-4 h-4" /> <span>Status</span>
                    </button>
                    <button 
                      onClick={() => handleClose(exam.id)}
                      className="flex-1 min-w-[80px] flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> <span>Close</span>
                    </button>
                    <button 
                      onClick={() => handleMoveToDraft(exam.id)}
                      className="flex-1 min-w-[80px] flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" /> <span>Draft</span>
                    </button>
                    <button 
                      onClick={() => navigate(`/admin/create?id=${exam.id}`)}
                      className="flex-1 min-w-[80px] flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(exam.id)}
                      className="flex-1 min-w-[80px] flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> <span>Delete</span>
                    </button>
                  </>
                )}
                {exam.status === 'draft' && (
                  <>
                    <button 
                      onClick={() => navigate(`/admin/create?id=${exam.id}`)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(exam.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> <span>Delete</span>
                    </button>
                  </>
                )}
                {exam.status === 'closed' && (
                  <>
                    <button 
                      onClick={() => navigate(`/admin/results?examId=${exam.id}`)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4" /> <span>Results</span>
                    </button>
                    <button 
                      onClick={() => navigate(`/admin/create?id=${exam.id}`)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(exam.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No exams found</h3>
          <p className="text-slate-500 mb-6">You haven't created any exams yet. Get started by creating your first test.</p>
          <button 
            onClick={() => navigate('/admin/create')}
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Create First Exam</span>
          </button>
        </div>
      )}

      {/* Live Status Modal */}
      {showLiveStatus && selectedExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Live Status: {selectedExam.name}</h2>
                <p className="text-sm text-slate-500">{sessions.length} Students currently active/submitted</p>
              </div>
              <button onClick={() => setShowLiveStatus(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-4 font-medium">Student Name</th>
                    <th className="pb-4 font-medium">Roll Number</th>
                    <th className="pb-4 font-medium">Status</th>
                    <th className="pb-4 font-medium">Answered</th>
                    <th className="pb-4 font-medium">Last Saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.map(session => (
                    <tr key={session.id} className="text-sm">
                      <td className="py-4 font-medium">{session.student_name}</td>
                      <td className="py-4 font-mono">{session.roll_number}</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          session.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="py-4">{Object.keys(session.responses || {}).length} / {selectedExam.total_questions}</td>
                      <td className="py-4 text-slate-400">
                        {session.submitted_at ? format(new Date(session.submitted_at), 'HH:mm:ss') : 'In Progress'}
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">No students have joined this exam yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageExams;
