// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Player from './Player';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Error Boundary Component untuk menangani error global
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Terjadi Kesalahan</h1>
            <p className="text-gray-300 mb-4">
              Maaf, terjadi error yang tidak terduga. Silakan refresh halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Refresh Halaman
            </button>
            <details className="mt-4 text-left text-sm text-gray-400">
              <summary className="cursor-pointer">Detail Error</summary>
              <pre className="mt-2 p-4 bg-gray-800 rounded overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fallback component untuk loading
const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-white text-lg">Memuat DramaBoxFinder...</p>
    </div>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));

// Tambahkan error handling untuk root rendering
try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <React.Suspense fallback={<LoadingFallback />}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/player/:bookId" element={<Player />} />
              {/* Fallback route untuk 404 */}
              <Route path="*" element={
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h1 className="text-4xl font-bold mb-4">404</h1>
                    <p className="text-xl mb-4">Halaman tidak ditemukan</p>
                    <a 
                      href="/" 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Kembali ke Beranda
                    </a>
                  </div>
                </div>
              } />
            </Routes>
          </BrowserRouter>
        </React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render React app:', error);
  
  // Fallback rendering jika React gagal
  const fallbackElement = document.getElementById('root');
  if (fallbackElement) {
    fallbackElement.innerHTML = `
      <div style="min-height: 100vh; background: #111827; display: flex; align-items: center; justify-content: center; color: white; text-align: center; padding: 20px;">
        <div>
          <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ef4444;">Aplikasi Error</h1>
          <p style="margin-bottom: 1rem; color: #9ca3af;">Maaf, terjadi error saat memuat aplikasi.</p>
          <button onclick="window.location.reload()" style="background: #dc2626; color: white; padding: 0.5rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer;">
            Refresh Halaman
          </button>
        </div>
      </div>
    `;
  }
}