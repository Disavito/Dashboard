import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import Accounts from './pages/Accounts';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import Settings from './pages/Settings';
// import EditSocioPage from './pages/EditSocioPage'; // Removed EditSocioPage import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="people" element={<People />} />
          {/* Removed the route for editing socios as it will now be a dialog */}
          {/* <Route path="edit-socio/:id" element={<EditSocioPage />} /> */}
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
