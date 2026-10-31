import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { ErrorState } from '@/components/ui';
import { ClassDetailPage } from '@/features/classes/ClassDetailPage';
import { ClassesPage } from '@/features/classes/ClassesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DiagnosticDetailPage } from '@/features/diagnostics/DiagnosticDetailPage';
import { DiagnosticsPage } from '@/features/diagnostics/DiagnosticsPage';
import { AdaptPage } from '@/features/exams/AdaptPage';
import { ExamBuilderPage } from '@/features/exams/ExamBuilderPage';
import { ExamDetailPage } from '@/features/exams/ExamDetailPage';
import { ExamsPage } from '@/features/exams/ExamsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StudentPage } from '@/features/students/StudentPage';
import { StudentsPage } from '@/features/students/StudentsPage';
import { UploadPage } from '@/features/upload/UploadPage';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'dashboard/alunos/:studentId', element: <DashboardPage /> },
      { path: 'turmas', element: <ClassesPage /> },
      { path: 'turmas/:classId', element: <ClassDetailPage /> },
      { path: 'turmas/:classId/pastas/:groupId', element: <ClassDetailPage /> },
      { path: 'provas', element: <ExamsPage /> },
      { path: 'provas/nova', element: <ExamBuilderPage /> },
      { path: 'provas/enviar', element: <UploadPage /> },
      { path: 'provas/:examId', element: <ExamDetailPage /> },
      { path: 'provas/:examId/adaptar', element: <AdaptPage /> },
      { path: 'diagnosticas', element: <DiagnosticsPage /> },
      { path: 'diagnosticas/:diagnosticId', element: <DiagnosticDetailPage /> },
      { path: 'alunos', element: <StudentsPage /> },
      { path: 'alunos/:studentId', element: <StudentPage /> },
      { path: 'configuracoes', element: <SettingsPage /> },
      { path: '*', element: <ErrorState message="Esta página não existe" /> },
    ],
  },
]);

export const App = () => <RouterProvider router={router} />;
