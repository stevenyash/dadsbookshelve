import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { Layout } from './components/layout/Layout';
import { CalibreCheck } from './components/CalibreCheck';
import LoginPage from './pages/LoginPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const [checkCalibre, setCheckCalibre] = useState(false);

  // After login success, show Calibre check
  useEffect(() => {
    if (isAuthenticated) {
      setCheckCalibre(true);
    }
  }, [isAuthenticated]);

  return (
    <>
      {checkCalibre && isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<CalibreCheck onReady={() => setCheckCalibre(false)} />} />
          <Route path="*" element={<CalibreCheck onReady={() => setCheckCalibre(false)} />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/jobs" replace /> : <LoginPage />} />
          
          <Route path="/jobs" element={<ProtectedRoute><JobsPage /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><div className="p-8 text-center">Settings coming soon</div></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="*" element={<Navigate to="/jobs" replace />} />
        </Routes>
      )}
    </>
  );
}