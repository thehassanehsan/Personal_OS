import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/Layout';
import { ToastContainer } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { DeenPage } from './pages/DeenPage';
import { ExercisePage } from './pages/ExercisePage';
import { DietPage } from './pages/DietPage';
import { WellnessPage } from './pages/WellnessPage';
import { FinancePage } from './pages/FinancePage';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:800, background:'linear-gradient(135deg, var(--slate-l), var(--cyan))', WebkitBackgroundClip:'text', backgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'1rem' }}>Life OS</div>
        <div className="spinner spinner-lg" style={{ margin:'0 auto' }}/>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace/>;
  return <AppLayout>{children}</AppLayout>;
};

const LoginWithRedirect = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace/>;
  return <LoginPage/>;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastContainer/>
      <Routes>
        <Route path="/login" element={<LoginWithRedirect/>}/>
        <Route path="/" element={<Protected><DashboardPage/></Protected>}/>
        <Route path="/tasks" element={<Protected><TasksPage/></Protected>}/>
        <Route path="/deen" element={<Protected><DeenPage/></Protected>}/>
        <Route path="/exercise" element={<Protected><ExercisePage/></Protected>}/>
        <Route path="/diet" element={<Protected><DietPage/></Protected>}/>
        <Route path="/wellness" element={<Protected><WellnessPage/></Protected>}/>
        <Route path="/finance" element={<Protected><FinancePage/></Protected>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
