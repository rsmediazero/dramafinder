// src/Player.js
import React, { useState, useEffect } from 'react';
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
    const [dramaData, setDramaData] = useState({ info: null, episodes: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
    const [downloadProgress, setDownloadProgress] = useState({});

    const fetchDramaData = async (targetBookId) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:3001/api/stream-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId: String(targetBookId) })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: Gagal memuat data drama`);
            const result = await response.json();
            if (result.success === false) throw new Error(result.message || "API mengembalikan error");
            if (!result.episodes || result.episodes.length === 0) throw new Error("Tidak ada episode yang tersedia untuk drama ini");
            return result.episodes;
        } catch (err) {
            console.error(`[ERROR] Fetch drama data:`, err);
            throw err;
        }
    };

    const showTooltip = (e, episode) => {
        setTooltip({
            show: true,
            content: `${episode.title} - Klik untuk nonton, klik ↓ untuk download`,
            x: e.clientX,
            y: e.clientY - 40
        });
    };

    const hideTooltip = () => {
        setTooltip({ show: false, content: '', x: 0, y: 0 });
    };

    const handleDownload = async (episode, e) => {
        e.stopPropagation();
        if (!episode.url) {
            alert('URL download tidak tersedia untuk episode ini');
            return;
        }

        try {
            setDownloadProgress(prev => ({ ...prev, [episode.episodeNumber]: 0 }));
            const response = await fetch(episode.url);
            const total = parseInt(response.headers.get('content-length') || '0');
            let loaded = 0;
            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.length;
                if (total > 0) {
                    const progress = Math.round((loaded / total) * 100);
                    setDownloadProgress(prev => ({ ...prev, [episode.episodeNumber]: progress }));
                }
            }

            const blob = new Blob(chunks);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${dramaData.info.title} - ${episode.title}.mp4`;
            link.click();
            window.URL.revokeObjectURL(url);

            setDownloadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[episode.episodeNumber];
                return newProgress;
            });

        } catch (error) {
            console.error('[ERROR] Gagal download:', error);
            alert('Gagal mengunduh episode. Silakan coba lagi.');
            setDownloadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[episode.episodeNumber];
                return newProgress;
            });
        }
    };

    const handleEpisodeChange = (episode) => {
        if (episode.url) {
            setCurrentEpisode(episode);
        } else {
            setError("Episode ini tidak memiliki URL yang valid");
        }
    };

    const handleVideoEnded = () => {
        const episodes = dramaData.episodes;
        if (!currentEpisode || !episodes || episodes.length === 0) return;
        const currentIndex = episodes.findIndex(ep => ep.episodeNumber === currentEpisode.episodeNumber);
        if (currentIndex > -1 && currentIndex < episodes.length - 1) {
            const nextEpisode = episodes[currentIndex + 1];
            setCurrentEpisode(nextEpisode);
        }
    };

    useEffect(() => {
        const initializePlayer = async () => {
            if (!bookId) {
                setError("ID drama tidak valid");
                return;
            }
            setCurrentEpisode(null);
            setDramaData({ info: null, episodes: [] });
            try {
                if (location.state && location.state.dramaInfo && String(location.state.dramaInfo.id) === bookId) {
                    const { dramaInfo, episodes, selectedEpisode } = location.state;
                    if (!episodes || episodes.length === 0) {
                        const fetchedEpisodes = await fetchDramaData(bookId);
                        setDramaData({ info: dramaInfo, episodes: fetchedEpisodes });
                        setCurrentEpisode(fetchedEpisodes[0]);
                    } else {
                        setDramaData({ info: dramaInfo, episodes: episodes });
                        setCurrentEpisode(selectedEpisode || episodes[0]);
                    }
                } else {
                    const fetchedEpisodes = await fetchDramaData(bookId);
                    const dummyInfo = { id: bookId, title: "Loading...", description: "Sedang memuat informasi drama...", category: "Drama" };
                    setDramaData({ info: dummyInfo, episodes: fetchedEpisodes });
                    setCurrentEpisode(fetchedEpisodes[0]);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        initializePlayer();
    }, [bookId, location.state]);

    if (isLoading) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold">Loading...</h1>
                        <Link to="/" className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
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
                        <Link to="/" className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
                            ← Kembali ke Daftar
                        </Link>
                    </div>
                    <ErrorMessage message={error} onRetry={() => window.location.reload()} />
                </div>
            </div>
        );
    }

    if (!dramaData.info || !currentEpisode || !dramaData.episodes.length) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <ErrorMessage message="Data drama tidak lengkap" onRetry={() => navigate('/')} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl md:text-2xl font-bold truncate">
                        {dramaData.info.title} - {currentEpisode.title}
                    </h1>
                    <Link to="/" className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
                        ← Kembali ke Daftar
                    </Link>
                </div>

                {/* Video Player */}
                <div className="bg-black mb-4 rounded-lg overflow-hidden flex justify-center">
                    {currentEpisode.url ? (
                        <video 
                            key={`${currentEpisode.episodeNumber}-${currentEpisode.url}`}
                            className="max-h-[75vh] w-full"
                            controls 
                            autoPlay
                            onEnded={handleVideoEnded}
                            onError={() => setError("Gagal memuat video. Silakan coba episode lain.")}
                        >
                            <source src={currentEpisode.url} type="video/mp4" />
                            Browser Anda tidak mendukung tag video.
                        </video>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-red-400">
                            Video tidak tersedia untuk episode ini
                        </div>
                    )}
                </div>

                {/* Drama Info */}
                <div className="bg-gray-800 p-4 rounded-lg">
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
                            <div key={ep.episodeNumber} className="relative group episode-container">
                                <button
                                    onClick={() => handleEpisodeChange(ep)}
                                    disabled={!ep.url}
                                    onMouseEnter={(e) => showTooltip(e, ep)}
                                    onMouseLeave={hideTooltip}
                                    className={`w-full p-2 rounded text-center transition-colors text-xs episode-button ${
                                        currentEpisode.episodeNumber === ep.episodeNumber 
                                            ? 'bg-red-600 font-bold text-white' 
                                            : ep.url 
                                                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    {ep.title.replace('EP ', '')}
                                </button>
                                {ep.url && (
                                    <button
                                        onClick={(e) => handleDownload(ep, e)}
                                        disabled={downloadProgress[ep.episodeNumber] > 0}
                                        className="absolute -top-1 -right-1 bg-green-600 hover:bg-green-700 
                                                 text-white rounded-full w-5 h-5 flex items-center justify-center
                                                 opacity-0 group-hover:opacity-100 transition-all duration-200
                                                 text-xs font-bold z-10 download-button
                                                 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                        title={`Download ${ep.title}`}
                                    >
                                        {downloadProgress[ep.episodeNumber] > 0 ? 
                                            <span className="text-[8px]">{downloadProgress[ep.episodeNumber]}%</span> : 
                                            '↓'
                                        }
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {tooltip.show && (
                <div 
                    className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-50 pointer-events-none
                               shadow-lg border border-gray-600 tooltip-custom"
                    style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
                >
                    {tooltip.content}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                                    w-0 h-0 border-l-4 border-r-4 border-t-4 
                                    border-l-transparent border-r-transparent border-t-gray-800">
                    </div>
                </div>
            )}
        </div>
    );
}