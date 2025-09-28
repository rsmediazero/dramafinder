// Tambahkan import icon
import { DownloadIcon, PlayIcon } from '@heroicons/react/24/solid'; // Jika menggunakan Heroicons

// Tambahkan state baru
const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });
const [downloadProgress, setDownloadProgress] = useState({});
const [completedDownloads, setCompletedDownloads] = useState(new Set());

// Fungsi untuk handle tooltip
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

// Fungsi download dengan progress
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
        
        // Create download link
        const blob = new Blob(chunks);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dramaData.info.title} - ${episode.title}.mp4`;
        link.click();
        
        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            setDownloadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[episode.episodeNumber];
                return newProgress;
            });
        }, 100);
        
    } catch (error) {
        console.error('[ERROR] Gagal download:', error);
        alert('Gagal mengunduh episode. Silakan coba lagi.');
        
        // Cleanup on error
        setDownloadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[episode.episodeNumber];
            return newProgress;
        });
    }
};

// Replace episode grid section dengan yang baru
<div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-3 mt-2 max-h-48 overflow-y-auto">
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
            
            {/* Tombol Download */}
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

{/* Tooltip Component */}
{tooltip.show && (
    <div 
        className="fixed bg-gray-800 text-white text-xs px-3 py-2 rounded-lg z-50 pointer-events-none
                   shadow-lg border border-gray-600 tooltip-custom"
        style={{ 
            left: tooltip.x, 
            top: tooltip.y,
            transform: 'translateX(-50%)'
        }}
    >
        {tooltip.content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                        w-0 h-0 border-l-4 border-r-4 border-t-4 
                        border-l-transparent border-r-transparent border-t-gray-800">
        </div>
    </div>
)}