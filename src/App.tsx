/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import ResultView from './pages/ResultView';
import Schedules from './pages/Schedules';
import Calculator from './pages/Calculator';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminResults from './pages/admin/Results';
import AdminExamRoutines from './pages/admin/ExamRoutines';
import AdminNotices from './pages/admin/Notices';
import AdminUsers from './pages/admin/Users';
import AdminSettings from './pages/admin/Settings';

import { ReactNode } from 'react';

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="result" element={<ResultView />} />
            <Route path="institute-results" element={<Home isInstitute />} />
            <Route path="exam-routine" element={<Schedules type="routine" />} />
            <Route path="notice-board" element={<Schedules type="notice" />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="admin/login" element={<AdminLogin />} />
            <Route 
              path="admin" 
              element={<AdminRoute><AdminDashboard /></AdminRoute>} 
            />
            <Route 
              path="admin/results" 
              element={<AdminRoute><AdminResults /></AdminRoute>} 
            />
            <Route 
              path="admin/schedules" 
              element={<AdminRoute><AdminExamRoutines /></AdminRoute>} 
            />
            <Route 
              path="admin/notices" 
              element={<AdminRoute><AdminNotices /></AdminRoute>} 
            />
            <Route 
              path="admin/users" 
              element={<AdminRoute><AdminUsers /></AdminRoute>} 
            />
            <Route 
              path="admin/settings" 
              element={<AdminRoute><AdminSettings /></AdminRoute>} 
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
