import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { StudentProvider } from './context/StudentContext';

// Pages
import Landing from './pages/Landing';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import CreateExam from './pages/admin/CreateExam';
import ManageExams from './pages/admin/ManageExams';
import Results from './pages/admin/Results';

import StudentEntry from './pages/student/StudentEntry';
import ExamPreview from './pages/student/ExamPreview';
import ExamInterface from './pages/student/ExamInterface';
import Submitted from './pages/student/Submitted';

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAdmin();
  return isAdmin ? <>{children}</> : <Navigate to="/admin" />;
};

export default function App() {
  return (
    <Router>
      <AdminProvider>
        <StudentProvider>
          <div className="min-h-screen bg-slate-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/student" element={<StudentEntry />} />

              {/* Admin Protected Routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
              } />
              <Route path="/admin/create" element={
                <ProtectedAdminRoute><CreateExam /></ProtectedAdminRoute>
              } />
              <Route path="/admin/manage" element={
                <ProtectedAdminRoute><ManageExams /></ProtectedAdminRoute>
              } />
              <Route path="/admin/results" element={
                <ProtectedAdminRoute><Results /></ProtectedAdminRoute>
              } />

              {/* Student Routes */}
              <Route path="/student/preview" element={<ExamPreview />} />
              <Route path="/student/exam" element={<ExamInterface />} />
              <Route path="/student/submitted" element={<Submitted />} />
            </Routes>
            <Toaster position="top-right" />
          </div>
        </StudentProvider>
      </AdminProvider>
    </Router>
  );
}
