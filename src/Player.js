// src/Player.js
import React, { useState, useEffect, useCallback } from 'react';
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
  onDownload
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
        className={`w-full p-2 rounded text-center transition-colors text-xs episode-button ${
          isCurrent
            ? 'bg-red-600 font-bold text-white'
            : episode.url
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title={episode.title}
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

// Komponen Confirmation Modal
const DownloadConfirmationModal = ({ isOpen, onConfirm, onCancel, episodeCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          Download Semua Episode?
        </h3>
        <p className="text-gray-300 mb-6">
          Anda akan mendownload {episodeCount} episode. Ini mungkin memakan waktu beberapa saat dan menggunakan kuota internet.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
          >
            Download Semua
          </button>
        </div>
      </div>
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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

  const handleDownloadEpisode = useCallback(async (episode) => {
    if (!episode?.url) {
      alert("URL download tidak tersedia untuk episode ini.");
      return;
    }

    setIsDownloading(true);
    
    try {
      console.log('Memulai download dari:', episode.url);
      
      // Method 1: Direct download menggunakan anchor tag (lebih cepat)
      const link = document.createElement('a');
      link.href = episode.url;
      
      // Ekstrak nama file dari URL atau buat custom filename
      const urlParts = episode.url.split('/');
      const originalFileName = urlParts[urlParts.length - 1];
      const fileName = originalFileName.includes('.mp4') 
        ? originalFileName 
        : `${dramaData.info?.title || 'Drama'}_${episode.title}.mp4`;
      
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download berhasil diproses:', fileName);
      
    } catch (err) {
      console.error("Gagal mengunduh:", err);
      
      // Fallback: Buka tab baru jika direct download gagal
      try {
        window.open(episode.url, '_blank');
        alert("Download dimulai di tab baru. Jika tidak otomatis terdownload, klik kanan pada video dan pilih 'Save video as'.");
      } catch (fallbackErr) {
        alert("Gagal mengunduh video. Silakan coba lagi atau gunakan browser lain.");
      }
    } finally {
      setIsDownloading(false);
    }
  }, [dramaData.info]);

  const handleDownloadAllEpisodes = useCallback(() => {
    const episodesWithUrl = dramaData.episodes.filter(ep => ep.url);
    
    if (episodesWithUrl.length === 0) {
      alert("Tidak ada episode yang dapat didownload.");
      return;
    }

    // Tutup modal
    setShowDownloadModal(false);

    // Download semua episode satu per satu
    episodesWithUrl.forEach((episode, index) => {
      // Delay sedikit antara setiap download untuk menghindari blockage
      setTimeout(() => {
        handleDownloadEpisode(episode);
      }, index * 1000); // 1 detik delay antara setiap download
    });

    alert(`Memulai download ${episodesWithUrl.length} episode. Browser akan memproses satu per satu.`);
  }, [dramaData.episodes, handleDownloadEpisode]);

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
          <div className="flex gap-2">
            {/* Tombol Download Episode Saat Ini */}
            {currentEpisode.url && (
              <button
                onClick={() => handleDownloadEpisode(currentEpisode)}
                disabled={isDownloading}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex items-center gap-2"
                title={`Download ${currentEpisode.title}`}
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    Download...
                  </>
                ) : (
                  <>
                    📥 Download Episode
                  </>
                )}
              </button>
            )}
            <Link 
              to="/" 
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              ← Kembali
            </Link>
          </div>
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
          
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">
              Daftar Episode ({dramaData.episodes.length}):
            </h3>
            {dramaData.episodes.some(ep => ep.url) && (
              <button
                onClick={() => setShowDownloadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded transition-colors"
                title="Download semua episode"
              >
                📥 Download Semua
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-3 mt-2 max-h-48 overflow-y-auto episode-list-container">
            {dramaData.episodes.map(ep => (
              <EpisodeButton
                key={ep.episodeNumber}
                episode={ep}
                isCurrent={currentEpisode.episodeNumber === ep.episodeNumber}
                onSelect={handleEpisodeChange}
                onDownload={handleDownloadEpisode}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Download Confirmation Modal */}
      <DownloadConfirmationModal
        isOpen={showDownloadModal}
        onConfirm={handleDownloadAllEpisodes}
        onCancel={() => setShowDownloadModal(false)}
        episodeCount={dramaData.episodes.filter(ep => ep.url).length}
      />

      {/* Downloading Indicator */}
      {isDownloading && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          Mengunduh video...
        </div>
      )}
    </div>
  );
}