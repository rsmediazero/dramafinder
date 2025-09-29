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
  onDownload,
  onSendToTelegram
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
      
      <div className="flex gap-1 w-full">
        {episode.url && (
          <>
            <button
              onClick={() => onDownload(episode)}
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors duration-200 flex-1 flex items-center justify-center gap-1"
              title={`Download ${episode.title}`}
            >
              📥
            </button>
            <button
              onClick={() => onSendToTelegram(episode)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors duration-200 flex-1 flex items-center justify-center gap-1"
              title={`Kirim ke Telegram ${episode.title}`}
            >
              📤
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Komponen Modal untuk Telegram
const TelegramModal = ({ isOpen, onClose, onSend, episode, isSending }) => {
  const [selectedTokens, setSelectedTokens] = useState([]);
  
  // Daftar token bot Telegram (simpan di environment variables untuk production)
  const telegramTokens = [
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_1 || 'YOUR_BOT_TOKEN_1', 
      name: 'Bot Utama',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_1 || 'YOUR_CHAT_ID_1'
    },
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_2 || 'YOUR_BOT_TOKEN_2', 
      name: 'Bot Backup',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_2 || 'YOUR_CHAT_ID_2'
    },
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_3 || 'YOUR_BOT_TOKEN_3', 
      name: 'Bot Channel',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_3 || 'YOUR_CHAT_ID_3'
    }
  ];

  const handleTokenToggle = (token) => {
    setSelectedTokens(prev => 
      prev.includes(token)
        ? prev.filter(t => t !== token)
        : [...prev, token]
    );
  };

  const handleSend = () => {
    if (selectedTokens.length === 0) {
      alert('Pilih minimal satu bot Telegram');
      return;
    }
    onSend(selectedTokens);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          Kirim ke Bot Telegram
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">
            Pilih bot Telegram tujuan:
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {telegramTokens.map((bot, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(bot.token)}
                  onChange={() => handleTokenToggle(bot.token)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white text-sm">{bot.name}</span>
                <span className="text-gray-400 text-xs">({bot.chatId})</span>
              </label>
            ))}
          </div>
        </div>

        {episode && (
          <div className="bg-gray-700 p-3 rounded mb-4">
            <p className="text-white text-sm font-semibold">Episode: {episode.title}</p>
            <p className="text-gray-300 text-xs truncate">URL: {episode.url}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSending}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || selectedTokens.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Mengirim...
              </>
            ) : (
              `Kirim ke ${selectedTokens.length} Bot`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Komponen Modal untuk Kirim Semua Episode
const TelegramAllModal = ({ isOpen, onClose, onSend, episodes, isSending }) => {
  const [selectedTokens, setSelectedTokens] = useState([]);
  
  const telegramTokens = [
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_1 || 'YOUR_BOT_TOKEN_1', 
      name: 'Bot Utama',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_1 || 'YOUR_CHAT_ID_1'
    },
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_2 || 'YOUR_BOT_TOKEN_2', 
      name: 'Bot Backup',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_2 || 'YOUR_CHAT_ID_2'
    },
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_3 || 'YOUR_BOT_TOKEN_3', 
      name: 'Bot Channel',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_3 || 'YOUR_CHAT_ID_3'
    }
  ];

  const handleTokenToggle = (token) => {
    setSelectedTokens(prev => 
      prev.includes(token)
        ? prev.filter(t => t !== token)
        : [...prev, token]
    );
  };

  const handleSend = () => {
    if (selectedTokens.length === 0) {
      alert('Pilih minimal satu bot Telegram');
      return;
    }
    onSend(selectedTokens);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          Kirim Semua Episode ke Telegram
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">
            Pilih bot Telegram tujuan:
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {telegramTokens.map((bot, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(bot.token)}
                  onChange={() => handleTokenToggle(bot.token)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white text-sm">{bot.name}</span>
                <span className="text-gray-400 text-xs">({bot.chatId})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-gray-700 p-3 rounded mb-4">
          <p className="text-white text-sm font-semibold">
            Total: {episodes.length} Episode
          </p>
          <p className="text-gray-300 text-xs">
            Akan mengirim semua episode ke {selectedTokens.length} bot yang dipilih
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSending}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || selectedTokens.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Mengirim...
              </>
            ) : (
              `Kirim ${episodes.length} Episode`
            )}
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
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramModal, setTelegramModal] = useState({ open: false, episode: null });
  const [telegramAllModal, setTelegramAllModal] = useState({ open: false });

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

  // Fungsi untuk mengirim ke Telegram
  const sendToTelegram = useCallback(async (tokens, episode, isMultiple = false) => {
    setIsSendingTelegram(true);
    
    try {
      const results = [];
      
      for (const token of tokens) {
        try {
          const message = {
            chat_id: token.chatId || process.env.REACT_APP_DEFAULT_CHAT_ID,
            text: `🎬 *${dramaData.info?.title || 'Drama'}*\n\n` +
                  `📺 *Episode:* ${episode.title}\n` +
                  `🔗 *URL:* ${episode.url}\n\n` +
                  `_Dikirim otomatis dari DramaStream_`,
            parse_mode: 'Markdown'
          };

          const response = await fetch(`https://api.telegram.org/bot${token.token}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
          });

          const result = await response.json();
          results.push({
            bot: token.name,
            success: response.ok,
            message: response.ok ? 'Berhasil' : result.description
          });

          // Delay antar request untuk menghindari rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (err) {
          results.push({
            bot: token.name,
            success: false,
            message: err.message
          });
        }
      }

      // Tampilkan hasil
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      if (failedCount === 0) {
        alert(`✅ Berhasil mengirim ke ${successCount} bot`);
      } else {
        const failedBots = results.filter(r => !r.success).map(r => `${r.bot}: ${r.message}`).join('\n');
        alert(`📊 Hasil pengiriman:\n✅ Berhasil: ${successCount}\n❌ Gagal: ${failedCount}\n\nGagal di:\n${failedBots}`);
      }

    } catch (err) {
      console.error('Error sending to Telegram:', err);
      alert('❌ Gagal mengirim ke Telegram: ' + err.message);
    } finally {
      setIsSendingTelegram(false);
      setTelegramModal({ open: false, episode: null });
      setTelegramAllModal({ open: false });
    }
  }, [dramaData.info]);

  // Fungsi untuk mengirim semua episode
  const sendAllToTelegram = useCallback(async (tokens) => {
    setIsSendingTelegram(true);
    
    try {
      const episodesWithUrl = dramaData.episodes.filter(ep => ep.url);
      let totalSuccess = 0;
      let totalFailed = 0;

      for (const episode of episodesWithUrl) {
        for (const token of tokens) {
          try {
            const message = {
              chat_id: token.chatId || process.env.REACT_APP_DEFAULT_CHAT_ID,
              text: `🎬 *${dramaData.info?.title || 'Drama'}*\n\n` +
                    `📺 *Episode:* ${episode.title}\n` +
                    `🔗 *URL:* ${episode.url}\n\n` +
                    `_Dikirim otomatis dari DramaStream_`,
              parse_mode: 'Markdown'
            };

            const response = await fetch(`https://api.telegram.org/bot${token.token}/sendMessage`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(message)
            });

            if (response.ok) {
              totalSuccess++;
            } else {
              totalFailed++;
            }

            // Delay untuk menghindari rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } catch (err) {
            totalFailed++;
            console.error(`Gagal mengirim ${episode.title} ke ${token.name}:`, err);
          }
        }
      }

      alert(`📊 Hasil pengiriman semua episode:\n✅ Berhasil: ${totalSuccess}\n❌ Gagal: ${totalFailed}`);

    } catch (err) {
      console.error('Error sending all to Telegram:', err);
      alert('❌ Gagal mengirim episode ke Telegram: ' + err.message);
    } finally {
      setIsSendingTelegram(false);
      setTelegramAllModal({ open: false });
    }
  }, [dramaData.episodes, dramaData.info]);

  const handleDownloadEpisode = useCallback(async (episode) => {
    if (!episode?.url) {
      alert("URL download tidak tersedia untuk episode ini.");
      return;
    }

    setIsDownloading(true);
    
    try {
      console.log('Memulai download dari:', episode.url);
      
      const link = document.createElement('a');
      link.href = episode.url;
      
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

  const handleEpisodeChange = useCallback((episode) => {
    if (episode.url) {
      setCurrentEpisode(episode);
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
            {/* Tombol Download & Kirim Telegram untuk Episode Saat Ini */}
            {currentEpisode.url && (
              <div className="flex gap-2">
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
                      📥 Download
                    </>
                  )}
                </button>
                <button
                  onClick={() => setTelegramModal({ open: true, episode: currentEpisode })}
                  disabled={isSendingTelegram}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex items-center gap-2"
                  title={`Kirim ke Telegram ${currentEpisode.title}`}
                >
                  {isSendingTelegram ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      📤 Telegram
                    </>
                  )}
                </button>
              </div>
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
                onClick={() => setTelegramAllModal({ open: true })}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded transition-colors flex items-center gap-1"
                title="Kirim semua episode ke Telegram"
              >
                📤 Kirim Semua ke Telegram
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
                onSendToTelegram={(episode) => setTelegramModal({ open: true, episode })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal Telegram untuk Single Episode */}
      <TelegramModal
        isOpen={telegramModal.open}
        onClose={() => setTelegramModal({ open: false, episode: null })}
        onSend={(tokens) => sendToTelegram(tokens, telegramModal.episode)}
        episode={telegramModal.episode}
        isSending={isSendingTelegram}
      />

      {/* Modal Telegram untuk Semua Episode */}
      <TelegramAllModal
        isOpen={telegramAllModal.open}
        onClose={() => setTelegramAllModal({ open: false })}
        onSend={sendAllToTelegram}
        episodes={dramaData.episodes.filter(ep => ep.url)}
        isSending={isSendingTelegram}
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