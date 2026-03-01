export type Subject = 'Physics' | 'Chemistry' | 'Botany' | 'Zoology';
export type QuestionType = 'text' | 'image';
export type ExamStatus = 'draft' | 'active' | 'closed';
export type SessionStatus = 'in_progress' | 'submitted';

export interface Exam {
  id: string;
  created_at: string;
  name: string;
  duration_minutes: number;
  exam_id: string;
  exam_password: string;
  status: ExamStatus;
  physics_count: number;
  chemistry_count: number;
  botany_count: number;
  zoology_count: number;
  total_questions: number;
}

export interface Question {
  id: string;
  exam_id: string;
  display_number: number;
  subject: Subject;
  question_type: QuestionType;
  question_text: string | null;
  question_image_url: string | null;
  option_a_type: QuestionType;
  option_a_value: string;
  option_b_type: QuestionType;
  option_b_value: string;
  option_c_type: QuestionType;
  option_c_value: string;
  option_d_type: QuestionType;
  option_d_value: string;
  correct_answer?: string; // Optional because students shouldn't see it
}

export interface Session {
  id: string;
  exam_id: string;
  student_name: string;
  roll_number: string;
  started_at: string;
  submitted_at: string | null;
  status: SessionStatus;
  responses: Record<string, string | null>;
  time_per_question: Record<string, number>;
}

export interface Result {
  id: string;
  session_id: string;
  exam_id: string;
  student_name: string;
  roll_number: string;
  total_score: number;
  max_score: number;
  percentage: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  physics_score: number;
  chemistry_score: number;
  botany_score: number;
  zoology_score: number;
  per_question_result: Record<string, {
    response: string | null;
    correct: string;
    marks: number;
    time_spent: number;
  }>;
  evaluated_at: string;
}
