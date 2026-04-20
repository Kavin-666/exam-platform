import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExamProvider } from './context/ExamContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, PublicRoute } from './components/UI/RouteGuards';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ExamList = lazy(() => import('./pages/ExamList'));
const ExamPage = lazy(() => import('./pages/ExamPage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const AdminExams = lazy(() => import('./pages/AdminExams'));
const ExamEditor = lazy(() => import('./pages/ExamEditor'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExamProvider>
          <ToastProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

                {/* Student routes */}
                <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
                <Route path="/student/exams" element={<ProtectedRoute role="student"><ExamList /></ProtectedRoute>} />
                <Route path="/student/exam/:examId" element={<ProtectedRoute role="student"><ExamPage /></ProtectedRoute>} />
                <Route path="/student/results/:attemptId" element={<ProtectedRoute role="student"><ResultPage /></ProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/exams" element={<ProtectedRoute role="admin"><AdminExams /></ProtectedRoute>} />
                <Route path="/admin/exams/new" element={<ProtectedRoute role="admin"><ExamEditor /></ProtectedRoute>} />
                <Route path="/admin/exams/:examId/edit" element={<ProtectedRoute role="admin"><ExamEditor /></ProtectedRoute>} />

                {/* Global Protected */}
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </ExamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
