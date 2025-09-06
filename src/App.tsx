import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import Accounts from './pages/Accounts';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Settings from './pages/Settings';
// Eliminadas las páginas de registro y edición directas ya que ahora son modales
// import RegisterSocioPage from './pages/RegisterSocioPage';
// import EditSocioPage from './pages/EditSocioPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<People />} />
          {/* Eliminadas las rutas directas para registro y edición */}
          {/* <Route path="people/register" element={<RegisterSocioPage />} /> */}
          {/* <Route path="people/edit/:id" element={<EditSocioPage />} /> */}
          <Route path="accounts" element={<Accounts />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
