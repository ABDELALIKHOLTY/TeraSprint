import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProjectGeneratorPage } from './pages/ProjectGeneratorPage';
import { Settings } from './pages/dashboard/Settings';
import { ProjectsPage } from './pages/dashboard/ProjectsPage';
import { ProjectDashboardPage } from './pages/dashboard/ProjectDashboardPage';
import { ProvidersPage } from './pages/dashboard/ProvidersPage';
import { CodingWorkspacePage } from './pages/workspace/CodingWorkspacePage';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { SplashScreen } from './components/ui/SplashScreen';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectGeneratorPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/projects" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/providers" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProvidersPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/projects/:id" 
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ProjectDashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/workspace/:id" 
        element={
          <ProtectedRoute>
            <CodingWorkspacePage />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
        <Router>
          <SplashScreen />
          <AppRoutes />
        </Router>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
