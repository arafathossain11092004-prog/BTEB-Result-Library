/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import IndividualResults from './pages/IndividualResults';
import GroupResults from './pages/GroupResults';
import ResultView from './pages/ResultView';
import Calculator from './pages/Calculator';
import ExamRoutines from './pages/ExamRoutines';
import Booklists from './pages/Booklists';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminResults from './pages/admin/Results';
import AdminExamRoutines from './pages/admin/ExamRoutines';
import AdminBooklists from './pages/admin/Booklists';
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
            <Route path="individual-results" element={<IndividualResults />} />
            <Route path="group-results" element={<GroupResults />} />
            <Route path="result" element={<ResultView />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="exam-routines" element={<ExamRoutines />} />
            <Route path="booklists" element={<Booklists />} />
            <Route path="about" element={<About />} />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
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
              path="admin/booklists" 
              element={<AdminRoute><AdminBooklists /></AdminRoute>} 
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
