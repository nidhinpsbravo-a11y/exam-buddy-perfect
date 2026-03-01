import React from 'react';
import { CheckCircle2, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';

const Submitted: React.FC = () => {
  const navigate = useNavigate();
  const { clearStudentSession } = useStudent();

  const handleFinish = () => {
    clearStudentSession();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 w-full max-w-xl text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Exam Submitted Successfully!</h1>
        <p className="text-slate-500 text-lg mb-12">
          Your responses have been recorded. You may now close this tab or return to the home page.
        </p>
        <button
          onClick={handleFinish}
          className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center mx-auto space-x-2"
        >
          <Home className="w-5 h-5" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
};

export default Submitted;
