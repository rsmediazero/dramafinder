// src/Player.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
        <p className="ml-4 text-gray-300">Memuat video...</p>
    </div>
);

const ErrorMessage = ({ message, onRetry }) => (
    <div className="bg-red-900 text-red-200 p-6 rounded-lg text-center max-w-md mx-auto">
        <p className="font-bold text-lg mb-2">Oops! Terjadi Kesalahan</p>
        <p className="mb-4">{message}</p>
        <div className="flex gap-2 justify-center">
            <button 
                onClick={() => window.history.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
                Kembali
            </button>
            {onRetry && (
                <button 
                    onClick={onRetry}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                    Coba Lagi
                </button>
            )}
        </div>
    </div>
);

// Custom hook untuk fetch data drama
const useDramaData = (bookId, locationState) => {
    const [state, setState] = useState({
        dramaInfo: null,
        episodes: [],
        currentEpisode: null,
        isLoading: true,
        error: null
    });

    const fetchDramaData = useCallback(async (targetBookId) => {
        try {
            console.log(`[LOG] Mengambil data untuk bookId: ${targetBookId}`);
            
            const response = await fetch('http://localhost:3001/api/stream-link', {
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
            
            return result.episodes;
            
        } catch (err) {
            console.error(`[ERROR] Fetch drama data:`, err);
            throw err;
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initializePlayer = async () => {
            if (!bookId) {
                setState(prev => ({ ...prev, error: "ID drama tidak valid", isLoading: false }));
                return;
            }

            try {
                setState(prev => ({ ...prev, isLoading: true, error: null }));

                // Cek cache dari location.state terlebih dahulu
                if (locationState && 
                    locationState.dramaInfo && 
                    String(locationState.dramaInfo.id) === bookId) {
                    
                    console.log("[LOG] Menggunakan data dari location.state");
                    
                    const { dramaInfo, episodes, selectedEpisode } = locationState;
                    
                    if (episodes && episodes.length > 0) {
                        if (isMounted) {
                            setState({
                                dramaInfo,
                                episodes,
                                currentEpisode: selectedEpisode || episodes[0],
                                isLoading: false,
                                error: null
                            });
                        }
                        return;
                    }
                }

                // Fallback: fetch dari API
                console.log("[LOG] Fetch data dari API...");
                const fetchedEpisodes = await fetchDramaData(bookId);
                
                const dramaInfo = locationState?.dramaInfo || {
                    id: bookId,
                    title: "Drama",
                    description: "Deskripsi tidak tersedia",
                    category: "Drama"
                };

                if (isMounted) {
                    setState({
                        dramaInfo,
                        episodes: fetchedEpisodes,
                        currentEpisode: fetchedEpisodes[0],
                        isLoading: false,
                        error: null
                    });
                }
                
            } catch (err) {
                if (isMounted) {
                    setState(prev => ({ 
                        ...prev, 
                        error: err.message, 
                        isLoading: false 
                    }));
                }
            }
        };

        initializePlayer();

        return () => {
            isMounted = false;
        };
    }, [bookId, locationState, fetchDramaData]);

    return state;
};

// Komponen untuk Copy Links Box
const CopyLinksBox = ({ episodes }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [showLinks, setShowLinks] = useState(false);

    // Filter hanya episode yang memiliki URL valid
    const validEpisodes = episodes.filter(ep => ep.url && ep.url.trim() !== '');
    
    // Format links untuk ditampilkan dan dicopy
    const formattedLinks = validEpisodes.map(ep => 
        `${ep.title}: ${ep.url}`
    ).join('\n\n');

    const handleCopyAllLinks = async () => {
        try {
            await navigator.clipboard.writeText(formattedLinks);
            setIsCopied(true);
            
            // Reset status copied setelah 3 detik
            setTimeout(() => setIsCopied(false), 3000);
        } catch (err) {
            console.error('Gagal menyalin link:', err);
            // Fallback untuk browser yang tidak support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = formattedLinks;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
        }
    };

    if (validEpisodes.length === 0) {
        return null; // Jangan render jika tidak ada link valid
    }

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-semibold text-white">
                    📋 Link Episode ({validEpisodes.length} episode)
                </h4>
                <button
                    onClick={handleCopyAllLinks}
                    disabled={isCopied}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                        isCopied 
                            ? 'bg-green-600 text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {isCopied ? (
                        <>
                            <span>✅ Disalin!</span>
                        </>
                    ) : (
                        <>
                            <span>📄</span>
                            Copy Semua Link
                        </>
                    )}
                </button>
            </div>

            {/* Toggle untuk show/hide links */}
            <button
                onClick={() => setShowLinks(!showLinks)}
                className="flex items-center gap-2 text-gray-300 hover:text-white text-sm mb-2 transition-colors"
            >
                <span>{showLinks ? '▼' : '▶'}</span>
                {showLinks ? 'Sembunyikan Link' : 'Tampilkan Link'}
            </button>

            {/* Box untuk menampilkan links */}
            {showLinks && (
                <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                        {formattedLinks}
                    </pre>
                </div>
            )}

            {/* Info jumlah episode */}
            <p className="text-xs text-gray-400 mt-2">
                {validEpisodes.length} dari {episodes.length} episode memiliki link yang valid
            </p>
        </div>
    );
};

// Komponen Header
const Header = ({ onBack, title, isError = false }) => (
    <div className="flex justify-between items-center mb-6">
        <h1 className={`text-xl md:text-2xl font-bold truncate max-w-[70%] ${
            isError ? 'text-red-400' : ''
        }`}>
            {title}
        </h1>
        <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex items-center"
        >
            ← Kembali
        </button>
    </div>
);

// Komponen Video Player
const VideoPlayer = ({ currentEpisode, videoRef, onEnded, onError }) => (
    <div className="bg-black mb-6 rounded-lg overflow-hidden flex justify-center">
        {currentEpisode.url ? (
            <video 
                ref={videoRef}
                key={currentEpisode.url}
                className="max-h-[75vh] w-full"
                controls 
                autoPlay
                playsInline
                onEnded={onEnded}
                onError={onError}
            >
                <source src={currentEpisode.url} type="video/mp4" />
                <track
                    kind="captions"
                    srcLang="id"
                    label="Indonesian"
                />
                Browser Anda tidak mendukung tag video.
            </video>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 text-red-400 p-4 text-center">
                <span className="text-4xl mb-2">📹</span>
                <p>Video tidak tersedia untuk episode ini</p>
            </div>
        )}
    </div>
);

// Komponen Episode Button
const EpisodeButton = ({ episode, isCurrent, onClick }) => (
    <button
        onClick={() => onClick(episode)}
        disabled={!episode.url}
        className={`
            w-full p-3 rounded text-center transition-all duration-200 text-sm font-medium
            ${isCurrent 
                ? 'bg-red-600 text-white shadow-lg transform scale-105' 
                : episode.url 
                    ? 'bg-gray-700 hover:bg-gray-600 hover:shadow-md text-white' 
                    : 'bg-gray-900 text-gray-500 cursor-not-allowed opacity-50'
            }
        `}
        title={episode.title}
    >
        {episode.title.replace('EP ', '')}
    </button>
);

// Main Player Component
export default function Player() {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookId } = useParams();
    const videoRef = useRef(null);
    
    const { dramaInfo, episodes, currentEpisode, isLoading, error } = 
        useDramaData(bookId, location.state);

    // Handle retry dengan reset state
    const handleRetry = useCallback(() => {
        navigate(location.pathname, { 
            replace: true,
            state: { ...location.state, forceRefresh: Date.now() }
        });
    }, [navigate, location.pathname, location.state]);

    // Handle episode change
    const handleEpisodeChange = useCallback((episode) => {
        if (episode.url) {
            // Scroll ke video player ketika ganti episode
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Set error state jika episode tidak memiliki URL
            // Note: Di sini kita perlu menggunakan state management yang proper
            // Untuk sementara, kita akan menggunakan alert sederhana
            alert("Episode ini tidak memiliki URL yang valid");
        }
    }, []);

    // Handle video ended - auto play next episode
    const handleVideoEnded = useCallback(() => {
        if (!currentEpisode || !episodes || episodes.length === 0) return;

        const currentIndex = episodes.findIndex(
            ep => ep.episodeNumber === currentEpisode.episodeNumber
        );

        if (currentIndex > -1 && currentIndex < episodes.length - 1) {
            const nextEpisode = episodes[currentIndex + 1];
            console.log(`[LOG] Auto-play episode: ${nextEpisode.title}`);
            // Untuk mengubah currentEpisode, kita perlu menggunakan state management
            // Di sini kita akan trigger episode change
            handleEpisodeChange(nextEpisode);
        }
    }, [currentEpisode, episodes, handleEpisodeChange]);

    // Effect untuk handle video source change
    useEffect(() => {
        if (videoRef.current && currentEpisode?.url) {
            videoRef.current.load();
            videoRef.current.play().catch(e => {
                console.log("Autoplay prevented:", e);
            });
        }
    }, [currentEpisode]);

    // Loading state
    if (isLoading) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <Header onBack={() => navigate('/')} title="Loading..." />
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <Header onBack={() => navigate('/')} title="Error" isError />
                    <ErrorMessage message={error} onRetry={handleRetry} />
                </div>
            </div>
        );
    }

    // Validasi data
    if (!dramaInfo || !currentEpisode || episodes.length === 0) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <Header onBack={() => navigate('/')} title="Data Tidak Lengkap" isError />
                    <ErrorMessage 
                        message="Data drama tidak lengkap atau tidak ditemukan" 
                        onRetry={() => navigate('/')} 
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Header 
                    onBack={() => navigate('/')} 
                    title={`${dramaInfo.title} - ${currentEpisode.title}`}
                />

                {/* Video Player */}
                <VideoPlayer 
                    currentEpisode={currentEpisode}
                    videoRef={videoRef}
                    onEnded={handleVideoEnded}
                    onError={() => {
                        alert("Gagal memuat video. Silakan coba episode lain.");
                    }}
                />

                {/* Drama Info & Episode List */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <p className="text-gray-300 mb-4 leading-relaxed">
                        {dramaInfo.description || "Tidak ada deskripsi tersedia."}
                    </p>
                    
                    {dramaInfo.category && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {dramaInfo.category.split(', ').map((tag, index) => (
                                <span key={index} className="bg-gray-700 text-xs px-3 py-1 rounded-full">
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    <div className="border-t border-gray-700 pt-4">
                        {/* BOX COPY LINK EPISODE */}
                        <CopyLinksBox episodes={episodes} />
                        
                        <h3 className="text-lg font-bold mb-4">
                            Daftar Episode ({episodes.length})
                        </h3>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto pr-2">
                            {episodes.map(ep => (
                                <EpisodeButton
                                    key={ep.episodeNumber}
                                    episode={ep}
                                    isCurrent={currentEpisode.episodeNumber === ep.episodeNumber}
                                    onClick={handleEpisodeChange}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}