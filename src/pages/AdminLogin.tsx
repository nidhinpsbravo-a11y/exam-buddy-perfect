import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { toast } from 'react-hot-toast';
import { Lock, ChevronLeft } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const { login } = useAdmin();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      toast.success('Logged in successfully');
      navigate('/admin/dashboard');
    } else {
      toast.error('Invalid password');
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
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-slate-500">Enter your password to access the portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
