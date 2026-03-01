import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Settings, BarChart3, LogOut, Users, FileText, CheckCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';

const Dashboard: React.FC = () => {
  const { logout } = useAdmin();
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalEvaluated: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: total } = await supabase.from('exams').select('*', { count: 'exact', head: true });
      const { count: active } = await supabase.from('exams').select('*', { count: 'exact', head: true }).eq('status', 'active');
      const { count: evaluated } = await supabase.from('results').select('*', { count: 'exact', head: true });

      setStats({
        totalExams: total || 0,
        activeExams: active || 0,
        totalEvaluated: evaluated || 0
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-blue-600">Admin Portal</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/admin/dashboard" className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium">
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/create" className="flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <PlusCircle className="w-5 h-5" />
            <span>Create Exam</span>
          </Link>
          <Link to="/admin/manage" className="flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <Settings className="w-5 h-5" />
            <span>Manage Exams</span>
          </Link>
          <Link to="/admin/results" className="flex items-center space-x-3 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <FileText className="w-5 h-5" />
            <span>Results</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-2 w-full text-slate-600 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h2 className="text-3xl font-bold">Dashboard Overview</h2>
          <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Exams</h3>
            <p className="text-3xl font-bold">{stats.totalExams}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Active Exams</h3>
            <p className="text-3xl font-bold">{stats.activeExams}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Students Evaluated</h3>
            <p className="text-3xl font-bold">{stats.totalEvaluated}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4 w-full">
              <Link to="/admin/create" className="p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
                Create New Exam
              </Link>
              <Link to="/admin/manage" className="p-4 bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 transition-colors font-medium">
                Manage Existing
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
