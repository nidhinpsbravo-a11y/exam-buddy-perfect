import React, { createContext, useContext, useState, useEffect } from 'react';
import { Exam, Session } from '../types';

interface StudentContextType {
  exam: Exam | null;
  session: Session | null;
  setExam: (exam: Exam | null) => void;
  setSession: (session: Session | null) => void;
  clearStudentSession: () => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exam, setExam] = useState<Exam | null>(() => {
    const saved = sessionStorage.getItem('studentExam');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [session, setSession] = useState<Session | null>(() => {
    const saved = sessionStorage.getItem('studentSession');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (exam) sessionStorage.setItem('studentExam', JSON.stringify(exam));
    else sessionStorage.removeItem('studentExam');
  }, [exam]);

  useEffect(() => {
    if (session) sessionStorage.setItem('studentSession', JSON.stringify(session));
    else sessionStorage.removeItem('studentSession');
  }, [session]);

  const clearStudentSession = () => {
    setExam(null);
    setSession(null);
    sessionStorage.removeItem('studentExam');
    sessionStorage.removeItem('studentSession');
  };

  return (
    <StudentContext.Provider value={{ exam, session, setExam, setSession, clearStudentSession }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) throw new Error('useStudent must be used within StudentProvider');
  return context;
};
