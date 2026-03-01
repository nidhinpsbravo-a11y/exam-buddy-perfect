import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';
import { Clock, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

const ExamPreview: React.FC = () => {
  const navigate = useNavigate();
  const { exam, session } = useStudent();

  if (!exam || !session) {
    return <div className="p-8 text-center">Session expired. Please login again.</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 w-full max-w-3xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">{exam.name}</h1>
          <p className="opacity-80">Please read the instructions carefully before starting.</p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center text-blue-600 mb-2">
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-bold">Duration</span>
              </div>
              <p className="text-2xl font-bold">{exam.duration_minutes} Min</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center text-emerald-600 mb-2">
                <BookOpen className="w-5 h-5 mr-2" />
                <span className="font-bold">Questions</span>
              </div>
              <p className="text-2xl font-bold">{exam.total_questions}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center text-purple-600 mb-2">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-bold">Marking</span>
              </div>
              <p className="text-sm font-bold">+4 Correct, -1 Wrong</p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <h3 className="text-lg font-bold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
              Important Instructions
            </h3>
            <ul className="space-y-3 text-slate-600 text-sm list-disc pl-5">
              <li>The exam consists of multiple-choice questions (MCQs).</li>
              <li>Each question has four options. Only one option is correct.</li>
              <li>You can navigate between questions using the question grid on the right.</li>
              <li>Click "Save & Next" to save your answer and move to the next question.</li>
              <li>You can "Mark for Review" to come back to a question later.</li>
              <li>The timer is displayed at the top right. The exam will auto-submit when the timer reaches zero.</li>
              <li>Do not refresh the page or use the back button during the exam.</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
            <h4 className="font-bold text-blue-900 mb-4">Subject Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {exam.physics_count > 0 && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-bold uppercase">Physics</p>
                  <p className="text-xl font-bold text-blue-900">{exam.physics_count}</p>
                </div>
              )}
              {exam.chemistry_count > 0 && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-bold uppercase">Chemistry</p>
                  <p className="text-xl font-bold text-blue-900">{exam.chemistry_count}</p>
                </div>
              )}
              {exam.botany_count > 0 && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-bold uppercase">Botany</p>
                  <p className="text-xl font-bold text-blue-900">{exam.botany_count}</p>
                </div>
              )}
              {exam.zoology_count > 0 && (
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-bold uppercase">Zoology</p>
                  <p className="text-xl font-bold text-blue-900">{exam.zoology_count}</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/student/exam')}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>I am ready to begin</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamPreview;
