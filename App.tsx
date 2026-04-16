import React, { useState } from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Sidebar from './src/components/Sidebar';
import Header from './src/components/Header';
import Footer from './src/components/Footer';
import Dashboard from './src/pages/Dashboard';
import LiveMonitor from './src/pages/LiveMonitor';
import History from './src/pages/History';
import Entry from './src/pages/Entry';
import Checker from './src/pages/Checker';
import Settings from './src/pages/Settings';
import Login from './src/pages/Login';
import NotFound from './src/pages/NotFound';
import Forbidden from './src/components/Forbidden';
import Users from './src/pages/Users';
import ActiveGallery from './src/pages/ActiveGallery';
import { WithAuth, WithRole } from './src/hoc/withAuth';

const AppContent: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = /^\/login$/i.test(location.pathname);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/Login" element={<Navigate replace to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">
      <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
      
      <div className="flex-1 flex flex-col lg:ml-[18rem] min-w-0 transition-all duration-300">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 p-5 md:p-8 lg:p-10 lg:pl-12 max-w-[1400px] mx-auto w-full">
          <WithAuth>
            <Routes>
              <Route path="/" element={
                <WithRole allowedRoles={['admin', 'operator']}>
                  <Dashboard />
                </WithRole>
              } />
              <Route path="/live" element={<LiveMonitor />} />
              <Route path="/history" element={<History />} />
              <Route path="/entry" element={<Entry />} />
              <Route path="/checker" element={<Checker />} />
              <Route path="/settings" element={
                <WithRole allowedRoles={['admin']}>
                  <Settings />
                </WithRole>
              } />
              <Route path="/users" element={
                <WithRole allowedRoles={['admin']}>
                  <Users />
                </WithRole>
              } />
              <Route path="/active-gallery" element={<ActiveGallery />} />
              <Route path="/forbidden" element={<Forbidden />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WithAuth>
        </main>

        <Footer />
      </div>

      {/* Ambient Glow Effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-matcha/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-matcha/5 blur-[120px] pointer-events-none z-0" />
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = React.useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  React.useEffect(() => {
    const handler = () => {
      setMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    window.addEventListener('parkiru-theme-change', handler as EventListener);
    return () => window.removeEventListener('parkiru-theme-change', handler as EventListener);
  }, []);

  return (
    <Theme appearance={mode} radius="large" scaling="100%">
      <Router>
        <AppContent />
        
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={mode}
          toastClassName="!bg-neutral-900 !border !border-white/10 !rounded-2xl !backdrop-blur-xl"
        />
      </Router>
    </Theme>
  );
}

export default App;