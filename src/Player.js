// src/Player.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link, useNavigate, useParams } from 'react-router-dom';

// Komponen dipisahkan untuk better organization
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
    <p className="ml-4 text-gray-300">Memuat video...</p>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-900 text-red-200 p-4 rounded-lg text-center">
    <p className="font-bold">Oops! Terjadi Kesalahan</p>
    <p className="mt-2">{message}</p>
    {onRetry && (
      <button 
        onClick={onRetry} 
        className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
      >
        Coba Lagi
      </button>
    )}
  </div>
);

const VideoPlayer = ({ episode, onEnded, onError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  const handleError = (error) => {
    console.error('Video error:', error);
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (!episode?.url) {
    return (
      <div className="flex items-center justify-center h-64 bg-black rounded-lg">
        <div className="text-red-400 text-center">
          <p>Video tidak tersedia untuk episode ini</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <LoadingSpinner />
        </div>
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
          <div className="text-red-400 text-center">
            <p>Gagal memuat video</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded text-sm"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )}
      
      <video
        key={episode.url}
        className="max-h-[75vh] w-full"
        controls
        autoPlay
        muted // Auto-play requires muted in modern browsers
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onEnded={onEnded}
        onError={handleError}
      >
        <source src={episode.url} type="video/mp4" />
        Browser Anda tidak mendukung pemutar video.
      </video>
    </div>
  );
};

const EpisodeButton = ({ 
  episode, 
  isCurrent, 
  onSelect, 
  onDownload,
  onShowTooltip,
  onHideTooltip 
}) => {
  const handleClick = () => {
    if (episode.url) {
      onSelect(episode);
    }
  };

  return (
    <div className="relative group flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={!episode.url}
        onMouseEnter={(e) => onShowTooltip(e, episode)}
        onMouseLeave={onHideTooltip}
        className={`w-full p-2 rounded text-center transition-colors text-xs episode-button ${
          isCurrent
            ? 'bg-red-600 font-bold text-white'
            : episode.url
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {episode.title.replace('EP ', '')}
      </button>
      
      {episode.url && (
        <button
          onClick={() => onDownload(episode)}
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors duration-200 flex items-center justify-center gap-1 w-full"
          title={`Download ${episode.title}`}
        >
          📥 DL
        </button>
      )}
    </div>
  );
};

export default function Player() {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookId } = useParams();

  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [dramaData, setDramaData] = useState({ info: null, episodes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // Cleanup effect untuk mencegah memory leaks
  useEffect(() => {
    return () => {
      // Cleanup tooltip timeout jika ada
      if (tooltip.timeoutId) {
        clearTimeout(tooltip.timeoutId);
      }
    };
  }, []);

  const fetchDramaData = useCallback(async (targetBookId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/stream-link', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ bookId: String(targetBookId) })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Gagal memuat data drama`);
      }
      
      const result = await response.json();
      
      if (result.success === false) {
        throw new Error(result.message || "API mengembalikan error");
      }
      
      if (!result.episodes || result.episodes.length === 0) {
        throw new Error("Tidak ada episode yang tersedia untuk drama ini");
      }
      
      return result.episodes;
    } catch (err) {
      console.error('[ERROR] Fetch drama data:', err);
      throw err;
    }
  }, []);

  const showTooltip = useCallback((e, episode) => {
    const timeoutId = setTimeout(() => {
      setTooltip({
        show: true,
        content: `${episode.title} - Klik untuk nonton, klik 📥 untuk download`,
        x: e.clientX,
        y: e.clientY - 40
      });
    }, 300); // Delay untuk mencegah tooltip muncul secara accidental

    setTooltip(prev => ({ ...prev, timeoutId }));
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => {
      if (prev.timeoutId) {
        clearTimeout(prev.timeoutId);
      }
      return { show: false, content: '', x: 0, y: 0 };
    });
  }, []);

  const handleDownloadEpisode = useCallback(async (episode) => {
    if (!episode.url) {
      alert("URL download tidak tersedia untuk episode ini.");
      return;
    }

    setIsDownloading(true);
    
    try {
      const response = await fetch(episode.url);
      if (!response.ok) throw new Error("Gagal mengunduh video.");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dramaData.info?.title || 'Drama'} - ${episode.title}.mp4`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup URL object setelah download
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      
    } catch (err) {
      console.error("Gagal mengunduh:", err);
      alert("Gagal mengunduh video. Silakan coba lagi.");
    } finally {
      setIsDownloadting(false);
    }
  }, [dramaData.info]);

  const handleEpisodeChange = useCallback((episode) => {
    if (episode.url) {
      setCurrentEpisode(episode);
      // Scroll ke video player ketika episode berubah
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError("Episode ini tidak memiliki URL yang valid");
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    const episodes = dramaData.episodes;
    if (!currentEpisode || !episodes || episodes.length === 0) return;
    
    const currentIndex = episodes.findIndex(
      ep => ep.episodeNumber === currentEpisode.episodeNumber
    );
    
    if (currentIndex > -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];
      setCurrentEpisode(nextEpisode);
    }
  }, [currentEpisode, dramaData.episodes]);

  const handleVideoError = useCallback(() => {
    setError("Gagal memuat video. Silakan coba episode lain.");
  }, []);

  // Main effect untuk inisialisasi player
  useEffect(() => {
    let isMounted = true;

    const initializePlayer = async () => {
      if (!bookId) {
        setError("ID drama tidak valid");
        setIsLoading(false);
        return;
      }

      setCurrentEpisode(null);
      setDramaData({ info: null, episodes: [] });

      try {
        if (location.state && location.state.dramaInfo && 
            String(location.state.dramaInfo.id) === bookId) {
          
          const { dramaInfo, episodes, selectedEpisode } = location.state;
          
          if (!episodes || episodes.length === 0) {
            const fetchedEpisodes = await fetchDramaData(bookId);
            if (isMounted) {
              setDramaData({ info: dramaInfo, episodes: fetchedEpisodes });
              setCurrentEpisode(fetchedEpisodes[0]);
            }
          } else {
            if (isMounted) {
              setDramaData({ info: dramaInfo, episodes: episodes });
              setCurrentEpisode(selectedEpisode || episodes[0]);
            }
          }
        } else {
          const fetchedEpisodes = await fetchDramaData(bookId);
          if (isMounted) {
            const dummyInfo = { 
              id: bookId, 
              title: "Loading...", 
              description: "Sedang memuat informasi drama...", 
              category: "Drama" 
            };
            setDramaData({ info: dummyInfo, episodes: fetchedEpisodes });
            setCurrentEpisode(fetchedEpisodes[0]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializePlayer();

    return () => {
      isMounted = false;
    };
  }, [bookId, location.state, fetchDramaData]);

  // Early returns untuk berbagai state
  if (isLoading) {
    return (
      <div className="bg-gray-900 min-h-screen text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">Memuat Player...</h1>
            <Link 
              to="/" 
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              ← Kembali ke Daftar
            </Link>
          </div>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 min-h-screen text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-red-400">Error</h1>
            <Link 
              to="/" 
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              ← Kembali ke Daftar
            </Link>
          </div>
          <ErrorMessage 
            message={error} 
            onRetry={() => window.location.reload()} 
          />
        </div>
      </div>
    );
  }

  if (!dramaData.info || !currentEpisode || !dramaData.episodes.length) {
    return (
      <div className="bg-gray-900 min-h-screen text-white">
        <div className="container mx-auto px-4 py-8">
          <ErrorMessage 
            message="Data drama tidak lengkap" 
            onRetry={() => navigate('/')} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl md:text-2xl font-bold truncate">
            {dramaData.info.title} - {currentEpisode.title}
          </h1>
          <Link 
            to="/" 
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
          >
            ← Kembali ke Daftar
          </Link>
        </div>

        {/* Video Player */}
        <VideoPlayer 
          episode={currentEpisode}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />

        {/* Drama Info & Episode List */}
        <div className="bg-gray-800 p-4 rounded-lg mt-4">
          <p className="text-gray-300 mb-4">
            {dramaData.info.description || "Tidak ada deskripsi tersedia."}
          </p>
          
          {dramaData.info.category && (
            <div className="flex flex-wrap gap-2 mb-4">
              {dramaData.info.category.split(', ').map((tag, index) => (
                <span key={index} className="bg-gray-700 text-xs px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          <h3 className="text-lg font-bold border-t border-gray-700 pt-4">
            Daftar Episode ({dramaData.episodes.length}):
          </h3>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-3 mt-2 max-h-48 overflow-y-auto episode-list-container">
            {dramaData.episodes.map(ep => (
              <EpisodeButton
                key={ep.episodeNumber}
                episode={ep}
                isCurrent={currentEpisode.episodeNumber === ep.episodeNumber}
                onSelect={handleEpisodeChange}
                onDownload={handleDownloadEpisode}
                onShowTooltip={showTooltip}
                onHideTooltip={hideTooltip}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-50 pointer-events-none shadow-lg border border-gray-600 tooltip-custom max-w-xs"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y, 
            transform: 'translateX(-50%)' 
          }}
        >
          {tooltip.content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800" />
        </div>
      )}

      {/* Downloading Indicator */}
      {isDownloading && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Mengunduh video...
        </div>
      )}
    </div>
  );
}