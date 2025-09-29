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
        muted
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

// Komponen Progress Modal untuk Kirim Semua
const ProgressModal = ({ isOpen, current, total, currentEpisode, successCount, failedCount, onCancel }) => {
  const progress = total > 0 ? (current / total) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          📤 Mengirim Semua Episode
        </h3>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-300 mb-2">
            <span>Progress: {current} / {total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Current Episode */}
        {currentEpisode && (
          <div className="bg-gray-700 p-3 rounded mb-4">
            <p className="text-white text-sm font-semibold">
              🎬 Sedang mengirim: {currentEpisode.title}
            </p>
            <p className="text-gray-300 text-xs truncate">
              🔗 {currentEpisode.url.substring(0, 40)}...
            </p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-green-900 bg-opacity-50 p-3 rounded text-center">
            <p className="text-green-400 text-lg font-bold">{successCount}</p>
            <p className="text-green-300 text-xs">Berhasil</p>
          </div>
          <div className="bg-red-900 bg-opacity-50 p-3 rounded text-center">
            <p className="text-red-400 text-lg font-bold">{failedCount}</p>
            <p className="text-red-300 text-xs">Gagal</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-yellow-900 bg-opacity-30 p-3 rounded mb-4">
          <p className="text-yellow-300 text-xs">
            ⚡ Mengirim satu per satu untuk menghindari spam detection...
          </p>
        </div>

        <button
          onClick={onCancel}
          className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
        >
          Batalkan Proses
        </button>
      </div>
    </div>
  );
};

// Komponen Password Modal
const PasswordModal = ({ isOpen, onClose, onVerify, isVerifying }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
      setError('Password tidak boleh kosong');
      return;
    }
    
    onVerify(password);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          🔒 Masukkan Password
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2">
              Password Akses Telegram:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              placeholder="Masukkan password..."
              disabled={isVerifying}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isVerifying}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Verifikasi...
                </>
              ) : (
                '🔓 Masuk'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Komponen Modal untuk Telegram Single Episode
const TelegramModal = ({ isOpen, onClose, onSend, episode, isSending }) => {
  const [selectedTokens, setSelectedTokens] = useState([]);
  
  // Daftar token bot Telegram - TOKEN DISENSOR UNTUK KEAMANAN
  const telegramTokens = [
    { 
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_1 || '***SENSORED***', 
      name: 'DramaStream Bot',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_1 || '***SENSORED***'
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
    
    // Ambil data bot lengkap berdasarkan token yang dipilih
    const selectedBots = telegramTokens.filter(bot => 
      selectedTokens.includes(bot.token)
    );
    
    onSend(selectedBots);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          📤 Kirim ke Bot Telegram
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">
            Pilih bot Telegram tujuan:
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {telegramTokens.map((bot, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-700 rounded">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(bot.token)}
                  onChange={() => handleTokenToggle(bot.token)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-white text-sm font-medium">{bot.name}</span>
                  <br />
                  <span className="text-gray-400 text-xs">Chat ID: ***SENSORED***</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {episode && (
          <div className="bg-gray-700 p-3 rounded mb-4">
            <p className="text-white text-sm font-semibold">🎬 Episode: {episode.title}</p>
            <p className="text-gray-300 text-xs truncate" title={episode.url}>
              🔗 URL: {episode.url.substring(0, 50)}...
            </p>
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
              `📤 Kirim ke ${selectedTokens.length} Bot`
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
      token: process.env.REACT_APP_TELEGRAM_BOT_TOKEN_1 || '***SENSORED***', 
      name: 'DramaStream Bot',
      chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID_1 || '***SENSORED***'
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
    
    const selectedBots = telegramTokens.filter(bot => 
      selectedTokens.includes(bot.token)
    );
    
    onSend(selectedBots);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-4">
          📤 Kirim Semua Episode ke Telegram
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-2">
            Pilih bot Telegram tujuan:
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {telegramTokens.map((bot, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-gray-700 rounded">
                <input
                  type="checkbox"
                  checked={selectedTokens.includes(bot.token)}
                  onChange={() => handleTokenToggle(bot.token)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-white text-sm font-medium">{bot.name}</span>
                  <br />
                  <span className="text-gray-400 text-xs">Chat ID: ***SENSORED***</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-gray-700 p-3 rounded mb-4">
          <p className="text-white text-sm font-semibold">
            📊 Total: {episodes.length} Episode
          </p>
          <p className="text-gray-300 text-xs">
            Akan mengirim semua episode ke {selectedTokens.length} bot yang dipilih
          </p>
          <p className="text-yellow-300 text-xs mt-1">
            ⚡ Proses: Satu per satu dengan delay 3-5 detik
          </p>
          <p className="text-blue-300 text-xs">
            ⏱️ Perkiraan waktu: {Math.ceil(episodes.length * 4)} detik
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
                Memulai...
              </>
            ) : (
              `📤 Mulai Kirim ${episodes.length} Episode`
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
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // State untuk progress modal
  const [progressModal, setProgressModal] = useState({
    open: false,
    current: 0,
    total: 0,
    currentEpisode: null,
    successCount: 0,
    failedCount: 0
  });
  
  const [passwordModal, setPasswordModal] = useState({ 
    open: false, 
    type: null, 
    episode: null, 
    bots: null 
  });
  const [telegramModal, setTelegramModal] = useState({ open: false, episode: null });
  const [telegramAllModal, setTelegramAllModal] = useState({ open: false });

  // Refs untuk cancel operation
  const isCancelledRef = React.useRef(false);

  // Password yang valid - GANTI DENGAN PASSWORD ANDA
  const VALID_PASSWORD = process.env.REACT_APP_TELEGRAM_PASSWORD || 'admin123';

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

  // Fungsi verifikasi password - FIXED: include VALID_PASSWORD in dependencies
  const verifyPassword = useCallback(async (password) => {
    setIsVerifyingPassword(true);
    
    // Simulasi proses verifikasi
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (password === VALID_PASSWORD) {
      setIsAuthenticated(true);
      setIsVerifyingPassword(false);
      setPasswordModal(prev => ({ ...prev, open: false }));
      return true;
    } else {
      setIsVerifyingPassword(false);
      alert('❌ Password salah! Silakan coba lagi.');
      return false;
    }
  }, [VALID_PASSWORD]);

  // Fungsi untuk membuka modal password
  const openPasswordModal = useCallback((type, episode = null, bots = null) => {
    setPasswordModal({
      open: true,
      type,
      episode,
      bots
    });
  }, []);

  // Fungsi untuk mengirim ke Telegram setelah authentication
  const sendToTelegram = useCallback(async (bots, episode) => {
    if (!isAuthenticated) {
      openPasswordModal('single', episode, bots);
      return;
    }

    setIsSendingTelegram(true);
    
    try {
      let successCount = 0;
      let failedCount = 0;
      const results = [];
      
      for (const bot of bots) {
        try {
          console.log('🔄 Mengirim ke:', bot.name);
          
          // Gunakan token dari environment variable atau fallback
          const botToken = bot.token.replace('***SENSORED***', 
            process.env.REACT_APP_TELEGRAM_BOT_TOKEN_1 || '8433377632:AAFjurpcQXQtiG7B8c6GyGXEKw5mjN-Vu0A'
          );
          
          const chatId = bot.chatId.replace('***SENSORED***',
            process.env.REACT_APP_TELEGRAM_CHAT_ID_1 || '5451748453'
          );

          // Encode message untuk URL
          const message = encodeURIComponent(
            `🎬 *${dramaData.info?.title || 'Drama'}*\n\n` +
            `📺 *Episode:* ${episode.title}\n` +
            `🔗 *URL:* ${episode.url}\n\n` +
            `_Dikirim otomatis dari DramaStream_`
          );
          
          // Gunakan URL-based approach
          const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=Markdown`;
          
          const response = await fetch(telegramUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result.ok) {
            successCount++;
            results.push({
              bot: bot.name,
              success: true,
              message: 'Berhasil dikirim'
            });
          } else {
            failedCount++;
            results.push({
              bot: bot.name,
              success: false,
              message: result.description || 'Unknown error'
            });
          }
          
        } catch (err) {
          console.error('❌ Error mengirim ke', bot.name, ':', err);
          failedCount++;
          results.push({
            bot: bot.name,
            success: false,
            message: err.message || 'Network error'
          });
        }
        
        // Delay untuk hindari rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Tampilkan hasil
      if (successCount > 0) {
        alert(`✅ Berhasil mengirim ke ${successCount} bot`);
      }
      
      if (failedCount > 0) {
        const failedBots = results.filter(r => !r.success).map(r => `• ${r.bot}: ${r.message}`).join('\n');
        alert(`❌ Gagal mengirim ke ${failedCount} bot:\n${failedBots}`);
      }
      
    } catch (err) {
      console.error('💥 Error utama:', err);
      alert('❌ Gagal mengirim ke Telegram: ' + err.message);
    } finally {
      setIsSendingTelegram(false);
      setTelegramModal({ open: false, episode: null });
    }
  }, [dramaData.info, isAuthenticated, openPasswordModal]);

  // Fungsi untuk mengirim semua episode SATU PER SATU - FIXED: no unsafe references in loop
  const sendAllToTelegram = useCallback(async (bots) => {
    if (!isAuthenticated) {
      openPasswordModal('all', null, bots);
      return;
    }

    setIsSendingTelegram(true);
    isCancelledRef.current = false;
    
    const episodesWithUrl = dramaData.episodes.filter(ep => ep.url);
    
    if (episodesWithUrl.length === 0) {
      alert('❌ Tidak ada episode yang dapat dikirim');
      return;
    }

    // Buka progress modal
    setProgressModal({
      open: true,
      current: 0,
      total: episodesWithUrl.length,
      currentEpisode: null,
      successCount: 0,
      failedCount: 0
    });

    let totalSuccess = 0;
    let totalFailed = 0;

    try {
      // FIXED: Create a separate function to handle sending individual episode
      const sendSingleEpisode = async (episode, currentIndex, successRef, failedRef) => {
        // Check jika proses dibatalkan
        if (isCancelledRef.current) {
          return { success: false, cancelled: true };
        }

        // Update progress modal dengan current values
        setProgressModal(prev => ({
          ...prev,
          current: currentIndex + 1,
          currentEpisode: episode,
          successCount: successRef.current,
          failedCount: failedRef.current
        }));

        let episodeSuccess = false;

        for (const bot of bots) {
          try {
            // Gunakan token dari environment variable atau fallback
            const botToken = bot.token.replace('***SENSORED***', 
              process.env.REACT_APP_TELEGRAM_BOT_TOKEN_1 || '8433377632:AAFjurpcQXQtiG7B8c6GyGXEKw5mjN-Vu0A'
            );
            
            const chatId = bot.chatId.replace('***SENSORED***',
              process.env.REACT_APP_TELEGRAM_CHAT_ID_1 || '5451748453'
            );

            const message = encodeURIComponent(
              `🎬 *${dramaData.info?.title || 'Drama'}*\n\n` +
              `📺 *Episode:* ${episode.title}\n` +
              `🔗 *URL:* ${episode.url}\n\n` +
              `_Dikirim otomatis dari DramaStream_`
            );
            
            const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}&parse_mode=Markdown`;
            
            console.log(`📤 Mengirim episode ${currentIndex + 1}/${episodesWithUrl.length}: ${episode.title}`);
            
            const response = await fetch(telegramUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (response.ok) {
              episodeSuccess = true;
              console.log(`✅ Berhasil: ${episode.title}`);
            } else {
              console.log(`❌ Gagal: ${episode.title}`);
            }
            
            // Random delay antara 3-5 detik untuk hindari spam detection
            const randomDelay = 3000 + Math.random() * 2000; // 3-5 detik
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
          } catch (err) {
            console.error(`💥 Error mengirim ${episode.title}:`, err);
          }
        }

        return { success: episodeSuccess, cancelled: false };
      };

      // Create refs for counters to avoid closure issues
      const successRef = { current: totalSuccess };
      const failedRef = { current: totalFailed };

      // Process episodes sequentially
      for (let i = 0; i < episodesWithUrl.length; i++) {
        const episode = episodesWithUrl[i];
        const result = await sendSingleEpisode(episode, i, successRef, failedRef);
        
        if (result.cancelled) {
          console.log('🚫 Proses dibatalkan oleh user');
          break;
        }

        if (result.success) {
          totalSuccess++;
          successRef.current = totalSuccess;
        } else {
          totalFailed++;
          failedRef.current = totalFailed;
        }

        // Update progress counts menggunakan functional update
        setProgressModal(prev => ({
          ...prev,
          successCount: totalSuccess,
          failedCount: totalFailed
        }));
      }
      
      // Tampilkan hasil akhir
      if (!isCancelledRef.current) {
        alert(`📊 Pengiriman selesai!\n✅ Berhasil: ${totalSuccess}\n❌ Gagal: ${totalFailed}`);
      } else {
        alert(`⏹️ Pengiriman dibatalkan!\n✅ Berhasil: ${totalSuccess}\n❌ Gagal: ${totalFailed}`);
      }
      
    } catch (err) {
      console.error('💥 Error mengirim semua episode:', err);
      if (!isCancelledRef.current) {
        alert('❌ Gagal mengirim episode: ' + err.message);
      }
    } finally {
      setIsSendingTelegram(false);
      setProgressModal(prev => ({ ...prev, open: false }));
      setTelegramAllModal({ open: false });
      isCancelledRef.current = false;
    }
  }, [dramaData.episodes, dramaData.info, isAuthenticated, openPasswordModal]);

  // Fungsi untuk membatalkan proses
  const cancelSending = useCallback(() => {
    isCancelledRef.current = true;
    setProgressModal(prev => ({ ...prev, open: false }));
    setIsSendingTelegram(false);
    alert('⏹️ Proses pengiriman dibatalkan');
  }, []);

  // Handle setelah password berhasil diverifikasi
  useEffect(() => {
    if (isAuthenticated && passwordModal.open) {
      if (passwordModal.type === 'single' && passwordModal.episode && passwordModal.bots) {
        sendToTelegram(passwordModal.bots, passwordModal.episode);
      } else if (passwordModal.type === 'all' && passwordModal.bots) {
        sendAllToTelegram(passwordModal.bots);
      }
    }
  }, [isAuthenticated, passwordModal, sendToTelegram, sendAllToTelegram]);

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
                disabled={isSendingTelegram}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Kirim semua episode ke Telegram"
              >
                {isSendingTelegram ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    📤 Kirim Semua ke Telegram
                  </>
                )}
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

      {/* Progress Modal */}
      <ProgressModal
        isOpen={progressModal.open}
        current={progressModal.current}
        total={progressModal.total}
        currentEpisode={progressModal.currentEpisode}
        successCount={progressModal.successCount}
        failedCount={progressModal.failedCount}
        onCancel={cancelSending}
      />

      {/* Password Modal */}
      <PasswordModal
        isOpen={passwordModal.open}
        onClose={() => setPasswordModal({ open: false, type: null, episode: null, bots: null })}
        onVerify={verifyPassword}
        isVerifying={isVerifyingPassword}
      />

      {/* Modal Telegram untuk Single Episode */}
      <TelegramModal
        isOpen={telegramModal.open}
        onClose={() => setTelegramModal({ open: false, episode: null })}
        onSend={(bots) => sendToTelegram(bots, telegramModal.episode)}
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

      {/* Telegram Sending Indicator */}
      {isSendingTelegram && !progressModal.open && (
        <div className="fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          Mengirim ke Telegram...
        </div>
      )}
    </div>
  );
}