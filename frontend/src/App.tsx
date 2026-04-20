import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Resumen from '@/pages/Resumen';
import Conversaciones from '@/pages/Conversaciones';
import Chat from '@/pages/Chat';
import Analytics from '@/pages/Analytics';
import Configuracion from '@/pages/Configuracion';

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/resumen" replace />} />
        <Route path="/resumen" element={<Resumen />} />
        <Route path="/conversaciones" element={<Conversaciones />} />
        <Route path="/conversaciones/:id" element={<Chat />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/resumen" replace />} />
    </Routes>
  );
}
