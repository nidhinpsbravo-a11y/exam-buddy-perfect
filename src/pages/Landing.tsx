import React from 'react';
import { ShieldCheck, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-slate-900 mb-2 uppercase tracking-tight">EXAM BUDDY</h1>
        <p className="text-slate-600 text-lg">Powered for serious preparation.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin')}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Admin Panel</h2>
          <p className="text-slate-500">Create and manage exams, evaluate results, and view analytics.</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/student')}
          className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 cursor-pointer flex flex-col items-center text-center group"
        >
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
            <BookOpen className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Student Exam</h2>
          <p className="text-slate-500">Enter your exam credentials to start your scheduled test.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing;
