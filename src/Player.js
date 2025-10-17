// src/Player.js
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Link, useNavigate, useParams } from 'react-router-dom';

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
    </div>
);

const ErrorMessage = ({ message, onRetry }) => (
    <div className="bg-red-900 text-red-200 p-4 rounded-lg text-center">
        <p><strong>Oops! Terjadi Kesalahan</strong></p>
        <p>{message}</p>
        {onRetry && (
            <button 
                onClick={onRetry}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
                Coba Lagi
            </button>
        )}
    </div>
);

export default function Player() {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookId } = useParams();
    
    const [currentEpisode, setCurrentEpisode] = useState(null);
    const [dramaData, setDramaData] = useState({
        info: null,
        episodes: [],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoError, setVideoError] = useState(null);
    
    // Fungsi untuk mendapatkan drama info dari location state atau membuat default
    const getDramaInfo = useCallback(() => {
        if (location.state && location.state.dramaInfo) {
            return location.state.dramaInfo;
        }
        
        // Fallback: buat info dasar dari bookId
        return {
            id: bookId,
            title: `Drama ${bookId}`,
            description: "Informasi drama sedang dimuat...",
            category: "Drama"
        };
    }, [location.state, bookId]);
    
    // Fungsi untuk fetch data drama dan episode
    const fetchDramaData = useCallback(async (targetBookId) => {
        setIsLoading(true);
        setError(null);
        setVideoError(null);
        
        try {
            console.log(`[Player] Mengambil data untuk bookId: ${targetBookId}`);
            
            const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
            
            const response = await fetch(`${API_BASE_URL}/api/stream-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            
            console.log(`[Player] Berhasil mendapatkan ${result.episodes.length} episode`);
            
            return result.episodes;
            
        } catch (err) {
            console.error(`[Player] Error fetch drama data:`, err);
            throw err;
        }
    }, []);
    
    // Effect utama untuk handle data loading
    useEffect(() => {
        const initializePlayer = async () => {
            if (!bookId) {
                setError("ID drama tidak valid");
                setIsLoading(false);
                return;
            }
            
            // Reset state
            setCurrentEpisode(null);
            setDramaData({ info: null, episodes: [] });
            setVideoError(null);
            
            try {
                const dramaInfo = getDramaInfo();
                let episodes = [];
                
                // Cek apakah ada episodes dari location.state
                if (location.state && location.state.episodes && location.state.episodes.length > 0) {
                    console.log("[Player] Menggunakan episodes dari location.state");
                    episodes = location.state.episodes;
                } else {
                    console.log("[Player] Fetch episodes dari API");
                    episodes = await fetchDramaData(bookId);
                }
                
                // Validasi episodes
                if (!episodes || episodes.length === 0) {
                    throw new Error("Tidak ada episode yang tersedia");
                }
                
                // Filter hanya episode yang memiliki URL valid
                const validEpisodes = episodes.filter(ep => ep && ep.url && ep.url.trim() !== '');
                
                if (validEpisodes.length === 0) {
                    throw new Error("Tidak ada episode dengan URL video yang valid");
                }
                
                console.log(`[Player] ${validEpisodes.length} episode valid ditemukan`);
                
                setDramaData({
                    info: dramaInfo,
                    episodes: validEpisodes,
                });
                
                // Set current episode - prioritaskan dari location.state atau ambil pertama
                const initialEpisode = location.state && location.state.selectedEpisode 
                    ? location.state.selectedEpisode 
                    : validEpisodes[0];
                    
                setCurrentEpisode(initialEpisode);
                
            } catch (err) {
                console.error("[Player] Error initializing player:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        
        initializePlayer();
    }, [bookId, location.state, getDramaInfo, fetchDramaData]);
    
    // Fungsi untuk retry
    const handleRetry = useCallback(() => {
        setError(null);
        setVideoError(null);
        setIsLoading(true);
        
        // Gunakan setTimeout untuk memberikan feedback visual
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }, []);
    
    // Fungsi untuk mengganti episode
    const handleEpisodeChange = useCallback((episode) => {
        if (episode && episode.url) {
            setCurrentEpisode(episode);
            setVideoError(null); // Clear video error saat ganti episode
        } else {
            setVideoError("Episode ini tidak memiliki URL yang valid");
        }
    }, []);

    const handleVideoEnded = useCallback(() => {
        const episodes = dramaData.episodes;
        if (!currentEpisode || !episodes || episodes.length === 0) {
            return;
        }

        // Cari index dari episode yang sedang diputar
        const currentIndex = episodes.findIndex(
            ep => ep.episodeNumber === currentEpisode.episodeNumber
        );

        // Cek apakah ada episode selanjutnya
        if (currentIndex > -1 && currentIndex < episodes.length - 1) {
            const nextEpisode = episodes[currentIndex + 1];
            console.log(`[Player] Video selesai, memutar episode selanjutnya: ${nextEpisode.title}`);
            setCurrentEpisode(nextEpisode);
        } else {
            console.log("[Player] Episode terakhir telah selesai");
            // Bisa tambahkan notifikasi atau auto-rewatch
        }
    }, [currentEpisode, dramaData.episodes]);
    
    // Handle video error
    const handleVideoError = useCallback((e) => {
        console.error("Video error:", e);
        const video = e.target;
        const errorCode = video.error ? video.error.code : 'unknown';
        
        let errorMessage = "Gagal memuat video. ";
        
        switch (errorCode) {
            case 1:
                errorMessage += "Video dibatalkan.";
                break;
            case 2:
                errorMessage += "Network error.";
                break;
            case 3:
                errorMessage += "Error decoding video.";
                break;
            case 4:
                errorMessage += "Video tidak didukung.";
                break;
            default:
                errorMessage += "Silakan coba episode lain.";
        }
        
        setVideoError(errorMessage);
    }, []);
    
    // Format episode title untuk tampilan
    const formatEpisodeTitle = (episode) => {
        if (!episode) return "Unknown";
        
        if (episode.title && episode.title.includes('EP')) {
            return episode.title.replace('EP ', '');
        }
        
        if (episode.episodeNumber) {
            return `EP ${episode.episodeNumber}`;
        }
        
        return "Episode";
    };
    
    // Loading state
    if (isLoading) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold">Memuat Drama...</h1>
                        <Link 
                            to="/" 
                            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                        >
                            ← Kembali ke Daftar
                        </Link>
                    </div>
                    <div className="text-center py-12">
                        <LoadingSpinner />
                        <p className="mt-4 text-gray-400">Sedang memuat data drama...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    // Error state
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
                    <ErrorMessage message={error} onRetry={handleRetry} />
                </div>
            </div>
        );
    }
    
    // Validasi final sebelum render
    if (!dramaData.info || !currentEpisode || !dramaData.episodes.length) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold text-red-400">Data Tidak Lengkap</h1>
                        <Link 
                            to="/" 
                            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                        >
                            ← Kembali ke Daftar
                        </Link>
                    </div>
                    <ErrorMessage 
                        message="Data drama tidak lengkap atau korup" 
                        onRetry={() => navigate('/')} 
                    />
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold truncate">
                            {dramaData.info.title}
                        </h1>
                        <p className="text-gray-400 text-sm md:text-base">
                            Sedang diputar: {currentEpisode.title || `Episode ${currentEpisode.episodeNumber}`}
                        </p>
                    </div>
                    <Link 
                        to="/" 
                        className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm whitespace-nowrap"
                    >
                        ← Kembali ke Daftar
                    </Link>
                </div>

                {/* Video Player Section */}
                <div className="bg-black rounded-lg overflow-hidden mb-6 shadow-2xl">
                    {videoError ? (
                        <div className="flex flex-col items-center justify-center h-64 md:h-96 p-8 text-center">
                            <div className="text-red-400 text-4xl mb-4">⚠️</div>
                            <p className="text-red-300 font-semibold mb-2">Error Video</p>
                            <p className="text-gray-400 text-sm mb-4">{videoError}</p>
                            <button
                                onClick={handleRetry}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors text-sm"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <video 
                            key={currentEpisode.url} // Force re-render saat ganti episode
                            className="w-full max-h-[75vh]"
                            controls 
                            autoPlay
                            playsInline
                            onEnded={handleVideoEnded}
                            onError={handleVideoError}
                            preload="metadata"
                        >
                            <source src={currentEpisode.url} type="video/mp4" />
                            <source src={currentEpisode.url} type="video/webm" />
                            Browser Anda tidak mendukung pemutar video.
                        </video>
                    )}
                </div>

                {/* Drama Info dan Episode List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Drama Information */}
                    <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-lg">
                        <h2 className="text-lg md:text-xl font-bold mb-4">Informasi Drama</h2>
                        
                        <p className="text-gray-300 mb-4 text-sm md:text-base">
                            {dramaData.info.description || "Tidak ada deskripsi tersedia."}
                        </p>
                        
                        {dramaData.info.category && (
                            <div className="mb-4">
                                <h3 className="font-semibold mb-2">Kategori:</h3>
                                <div className="flex flex-wrap gap-2">
                                    {dramaData.info.category.split(', ').map((tag, index) => (
                                        <span 
                                            key={index} 
                                            className="bg-gray-700 text-xs px-3 py-1 rounded-full border border-gray-600"
                                        >
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Episode List */}
                    <div className="bg-gray-800 p-4 md:p-6 rounded-lg">
                        <h3 className="text-lg font-bold mb-4">
                            Daftar Episode ({dramaData.episodes.length})
                        </h3>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-2">
                            {dramaData.episodes.map((ep, index) => (
                                <button
                                    key={ep.episodeNumber || index}
                                    onClick={() => handleEpisodeChange(ep)}
                                    disabled={!ep.url}
                                    className={`w-full p-2 rounded text-center transition-all duration-200 text-xs font-medium ${
                                        currentEpisode.episodeNumber === ep.episodeNumber 
                                            ? 'bg-red-600 text-white shadow-lg transform scale-105' 
                                            : ep.url 
                                                ? 'bg-gray-700 hover:bg-gray-600 text-white hover:shadow-md' 
                                                : 'bg-gray-900 text-gray-500 cursor-not-allowed'
                                    }`}
                                    title={ep.title || `Episode ${ep.episodeNumber}`}
                                >
                                    {formatEpisodeTitle(ep)}
                                </button>
                            ))}
                        </div>
                        
                        {dramaData.episodes.length === 0 && (
                            <p className="text-gray-400 text-center py-4 text-sm">
                                Tidak ada episode tersedia
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}