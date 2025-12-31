import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { ProjectsPage } from './components/ProjectsPage';
import { LogsPage } from './components/LogsPage';
import { ProfilePage } from './components/ProfilePage';
import { authService } from './services/authService';

function App() {
  // Check authentication on mount
  const isAuthenticated = authService.isAuthenticated();

  return (
    <BrowserRouter>
      <Routes>
        {/* Home page - always accessible, auto-creates user */}
        <Route path="/" element={<HomePage />} />

        {/* Protected routes */}
        <Route
          path="/projects"
          element={
            isAuthenticated ? (
              <ProjectsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/logs"
          element={
            isAuthenticated ? (
              <LogsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <ProfilePage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
