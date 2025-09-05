import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ui-custom/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ui-custom/ThemeToggle';
import Sidebar from '@/components/ui-custom/Sidebar';
import Dashboard from '@/pages/Dashboard';
import People from '@/pages/People';
import Income from '@/pages/Income';
import Expenses from '@/pages/Expenses';
import Settings from '@/pages/Settings';

// La siguiente línea ha sido eliminada porque los componentes Card no se usan directamente en App.tsx
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm flex items-center justify-between h-16 px-6">
              <h1 className="text-2xl font-bold text-foreground">Dashboard Financiero</h1>
              <ThemeToggle />
            </header>
            <main className="flex-1 p-6 lg:p-8 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/people" element={<People />} />
                <Route path="/income" element={<Income />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
