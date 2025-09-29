// src/Player.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Password configuration - bisa dipindah ke .env file
const PASSWORD_CONFIG = {
    // Multiple passwords yang valid (bisa diubah di .env)
    VALID_PASSWORDS: process.env.REACT_APP_VALID_PASSWORDS 
        ? process.env.REACT_APP_VALID_PASSWORDS.split(',') 
        : ['drama2024', 'stream123', 'secretpass'],
    
    // Maximum attempts sebelum diblokir
    MAX_ATTEMPTS: 3,
    
    // Block duration in milliseconds (24 jam)
    BLOCK_DURATION: 24 * 60 * 60 * 1000,
    
    // VIP Access codes
    VIP_CODES: process.env.REACT_APP_VIP_CODES 
        ? process.env.REACT_APP_VIP_CODES.split(',')
        : ['VIP123', 'PREMIUM456', 'ACCESS789']
};

// Security Service untuk handle blocking
class SecurityService {
    constructor() {
        this.storageKey = 'drama_player_security';
        this.blockedKey = 'drama_player_blocked';
        this.vipKey = 'drama_player_vip';
    }

    // Check jika user sudah diblokir
    isUserBlocked() {
        const blockedData = localStorage.getItem(this.blockedKey);
        if (!blockedData) return false;

        try {
            const { timestamp } = JSON.parse(blockedData);
            const now = Date.now();
            
            // Jika masih dalam periode blokir
            if (now - timestamp < PASSWORD_CONFIG.BLOCK_DURATION) {
                console.log(`[SECURITY] User masih diblokir sampai: ${new Date(timestamp + PASSWORD_CONFIG.BLOCK_DURATION)}`);
                return true;
            } else {
                // Hapus blokir jika sudah expired
                this.clearBlock();
                return false;
            }
        } catch (error) {
            this.clearBlock();
            return false;
        }
    }

    // Block user
    blockUser() {
        const blockData = {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            ip: 'unknown'
        };
        
        localStorage.setItem(this.blockedKey, JSON.stringify(blockData));
        console.log(`[SECURITY] User diblokir: ${navigator.userAgent}`);
        
        // Log ke console untuk monitoring
        this.logSecurityEvent('USER_BLOCKED', blockData);
    }

    // Clear block
    clearBlock() {
        localStorage.removeItem(this.blockedKey);
        localStorage.removeItem(this.storageKey);
    }

    // Get attempt data
    getAttemptData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : { attempts: 0, lastAttempt: 0 };
    }

    // Update attempt data
    updateAttemptData(attempts) {
        const attemptData = {
            attempts,
            lastAttempt: Date.now(),
            userAgent: navigator.userAgent
        };
        localStorage.setItem(this.storageKey, JSON.stringify(attemptData));
    }

    // Reset attempt data
    resetAttemptData() {
        localStorage.removeItem(this.storageKey);
    }

    // Log security events
    logSecurityEvent(eventType, data) {
        const log = {
            event: eventType,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ...data
        };
        console.log('[SECURITY EVENT]:', log);
    }

    // Validate password
    validatePassword(inputPassword) {
        return PASSWORD_CONFIG.VALID_PASSWORDS.includes(inputPassword.trim());
    }

    // Validate VIP code
    validateVIPCode(code) {
        return PASSWORD_CONFIG.VIP_CODES.includes(code.trim().toUpperCase());
    }

    // Activate VIP
    activateVIP() {
        const vipData = {
            activated: true,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };
        localStorage.setItem(this.vipKey, JSON.stringify(vipData));
    }

    // Check if user has VIP access
    hasVIPAccess() {
        const vipData = localStorage.getItem(this.vipKey);
        if (!vipData) return false;

        try {
            const { activated } = JSON.parse(vipData);
            return activated === true;
        } catch (error) {
            return false;
        }
    }

    // Get blocked user info
    getBlockedUserInfo() {
        const blockedData = localStorage.getItem(this.blockedKey);
        if (!blockedData) return null;
        
        try {
            return JSON.parse(blockedData);
        } catch (error) {
            return null;
        }
    }
}

// Initialize security service
const securityService = new SecurityService();

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

// Komponen VIP Modal
const VIPModal = ({ isOpen, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('subscribe'); // 'subscribe' or 'code'
    const [vipCode, setVipCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVIPCodeSubmit = async (e) => {
        e.preventDefault();
        if (!vipCode.trim()) {
            setError('Kode VIP tidak boleh kosong');
            return;
        }

        setIsLoading(true);
        setError('');

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const isValid = securityService.validateVIPCode(vipCode);
            
            if (isValid) {
                securityService.activateVIP();
                onSuccess();
                setVipCode('');
            } else {
                setError('Kode VIP tidak valid!');
                setVipCode('');
            }
        } catch (err) {
            setError('Terjadi kesalahan sistem');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubscribe = () => {
        // Redirect ke Telegram admin
        const telegramAdmins = ['@contoh1', '@contoh2', '@contoh3'];
        const randomAdmin = telegramAdmins[Math.floor(Math.random() * telegramAdmins.length)];
        const message = `Halo admin, saya ingin berlangganan VIP DramaBoxFinder.`;
        const telegramUrl = `https://t.me/${randomAdmin.replace('@', '')}?text=${encodeURIComponent(message)}`;
        window.open(telegramUrl, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Akses VIP Diperlukan</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl"
                    >
                        ×
                    </button>
                </div>
                
                <div className="bg-purple-900 border border-purple-700 rounded p-3 mb-4">
                    <p className="text-purple-200 text-sm text-center">
                        🎬 Episode 6 dan seterusnya membutuhkan akses VIP
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex mb-4 border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('subscribe')}
                        className={`flex-1 py-2 text-center font-medium ${
                            activeTab === 'subscribe' 
                                ? 'text-purple-400 border-b-2 border-purple-400' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Berlangganan
                    </button>
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`flex-1 py-2 text-center font-medium ${
                            activeTab === 'code' 
                                ? 'text-purple-400 border-b-2 border-purple-400' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Masukan Kode
                    </button>
                </div>

                {/* Subscribe Tab */}
                {activeTab === 'subscribe' && (
                    <div className="space-y-4">
                        <div className="text-center mb-4">
                            <h4 className="text-lg font-bold text-white mb-2">Berlangganan VIP</h4>
                            <p className="text-gray-300 text-sm">Untuk mengunduh dan menonton semua episode</p>
                        </div>

                        <div className="space-y-3">
                            {/* Paket 1 Minggu */}
                            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="font-semibold text-white">Paket VIP Premium</h5>
                                    <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                                        1 Minggu
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-green-400">Rp 20.000</span>
                                    <button
                                        onClick={handleSubscribe}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        Daftar
                                    </button>
                                </div>
                            </div>

                            {/* Paket 1 Bulan */}
                            <div className="bg-purple-900 rounded-lg p-4 border-2 border-purple-500 relative">
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                    POPULAR
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="font-semibold text-white">Paket VIP Premium</h5>
                                    <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded">
                                        1 Bulan
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-yellow-400">Rp 50.000</span>
                                    <button
                                        onClick={handleSubscribe}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        Daftar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-4">
                            <p className="text-gray-400 text-sm">
                                Chat admin Telegram untuk berlangganan:
                            </p>
                            <div className="flex justify-center gap-2 mt-2">
                                {['@contoh1', '@contoh2', '@contoh3'].map((admin, index) => (
                                    <span key={index} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                                        {admin}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* VIP Code Tab */}
                {activeTab === 'code' && (
                    <form onSubmit={handleVIPCodeSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Masukkan Kode VIP:
                            </label>
                            <input
                                type="text"
                                value={vipCode}
                                onChange={(e) => {
                                    setVipCode(e.target.value.toUpperCase());
                                    setError('');
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                placeholder="Masukkan kode VIP..."
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
                                <p className="text-red-200 text-sm">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !vipCode.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        Memverifikasi...
                                    </>
                                ) : (
                                    'Aktifkan VIP'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// Komponen Password Modal
const PasswordModal = ({ isOpen, onClose, onSuccess, remainingAttempts, actionType = "akses" }) => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const getActionText = () => {
        switch (actionType) {
            case "copy":
                return "menyalin link";
            case "show":
                return "menampilkan link";
            default:
                return "mengakses fitur";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('Password tidak boleh kosong');
            return;
        }

        setIsLoading(true);
        setError('');

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const isValid = securityService.validatePassword(password);
            
            if (isValid) {
                securityService.resetAttemptData();
                onSuccess();
                setPassword('');
            } else {
                const currentAttempts = securityService.getAttemptData().attempts + 1;
                securityService.updateAttemptData(currentAttempts);
                
                if (currentAttempts >= PASSWORD_CONFIG.MAX_ATTEMPTS) {
                    securityService.blockUser();
                    window.location.reload(); // Reload untuk trigger block screen
                    return;
                }
                
                setError(`Password salah! Percobaan ${currentAttempts} dari ${PASSWORD_CONFIG.MAX_ATTEMPTS}`);
                setPassword('');
            }
        } catch (err) {
            setError('Terjadi kesalahan sistem');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Akses Diperlukan</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl"
                    >
                        ×
                    </button>
                </div>
                
                <div className="bg-yellow-900 border border-yellow-700 rounded p-3 mb-4">
                    <p className="text-yellow-200 text-sm">
                        🔒 Fitur ini membutuhkan password untuk {getActionText()}. 
                        {remainingAttempts > 0 && (
                            <span className="font-semibold"> Percobaan tersisa: {PASSWORD_CONFIG.MAX_ATTEMPTS - remainingAttempts}</span>
                        )}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Masukkan Password:
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                            placeholder="Ketik password di sini..."
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900 border border-red-700 rounded p-3 mb-4">
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !password.trim()}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                    Memverifikasi...
                                </>
                            ) : (
                                'Masuk'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Blocked Screen Component
const BlockedScreen = () => {
    const blockedData = securityService.getBlockedUserInfo();
    
    if (!blockedData) {
        return (
            <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">❓</div>
                    <h1 className="text-2xl font-bold text-yellow-400 mb-4">Data Blokir Tidak Ditemukan</h1>
                    <p className="text-gray-300">Coba refresh halaman atau hubungi administrator.</p>
                </div>
            </div>
        );
    }

    const blockTime = new Date(blockedData.timestamp);
    const unblockTime = new Date(blockedData.timestamp + PASSWORD_CONFIG.BLOCK_DURATION);

    return (
        <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
                <div className="text-6xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold text-red-400 mb-4">Akses Diblokir</h1>
                <div className="bg-red-900 border border-red-700 rounded p-4 mb-4">
                    <p className="text-red-200">
                        Anda telah melebihi batas percobaan password yang diperbolehkan.
                    </p>
                </div>
                <div className="text-gray-300 text-sm space-y-2 mb-4">
                    <p><strong>Waktu Blokir:</strong> {blockTime.toLocaleString('id-ID')}</p>
                    <p><strong>Buka Blokir:</strong> {unblockTime.toLocaleString('id-ID')}</p>
                    <p><strong>Durasi:</strong> 24 Jam</p>
                </div>
                <div className="mt-6 p-4 bg-gray-700 rounded text-xs text-gray-400">
                    <p><strong>Catatan Keamanan:</strong></p>
                    <p>Akses Anda telah dicatat untuk alasan keamanan.</p>
                    <p className="mt-2 text-xs break-all">
                        <strong>User Agent:</strong> {blockedData.userAgent}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Custom hook untuk security state
const useSecurity = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showVIPModal, setShowVIPModal] = useState(false);
    const [remainingAttempts, setRemainingAttempts] = useState(PASSWORD_CONFIG.MAX_ATTEMPTS);
    const [modalAction, setModalAction] = useState("akses");

    useEffect(() => {
        // Check jika user sudah diblokir
        if (securityService.isUserBlocked()) {
            return;
        }

        // Load attempt data
        const attemptData = securityService.getAttemptData();
        setRemainingAttempts(attemptData.attempts);
    }, []);

    const requireAuth = (actionType = "akses") => {
        if (isAuthenticated) return true;
        
        setModalAction(actionType);
        setShowPasswordModal(true);
        return false;
    };

    const requireVIPAccess = () => {
        if (securityService.hasVIPAccess()) return true;
        
        setShowVIPModal(true);
        return false;
    };

    const handleAuthSuccess = () => {
        setIsAuthenticated(true);
        setShowPasswordModal(false);
    };

    const handleVIPSuccess = () => {
        setShowVIPModal(false);
        window.location.reload(); // Reload untuk refresh akses episode
    };

    const handleCloseModal = () => {
        setShowPasswordModal(false);
    };

    const handleCloseVIPModal = () => {
        setShowVIPModal(false);
    };

    return {
        isAuthenticated,
        showPasswordModal,
        showVIPModal,
        remainingAttempts,
        modalAction,
        requireAuth,
        requireVIPAccess,
        handleAuthSuccess,
        handleVIPSuccess,
        handleCloseModal,
        handleCloseVIPModal
    };
};

// Komponen CopyLinksBox dengan security
const CopyLinksBox = ({ episodes }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [showLinks, setShowLinks] = useState(false);
    const {
        isAuthenticated,
        showPasswordModal,
        remainingAttempts,
        modalAction,
        requireAuth,
        handleAuthSuccess,
        handleCloseModal
    } = useSecurity();

    // Filter hanya episode yang memiliki URL valid
    const validEpisodes = episodes.filter(ep => ep.url && ep.url.trim() !== '');
    
    // Format links untuk ditampilkan dan dicopy
    const formattedLinks = validEpisodes.map(ep => 
        `${ep.title}: ${ep.url}`
    ).join('\n\n');

    const handleCopyAllLinks = async () => {
        // Check authentication first
        if (!requireAuth("copy")) return;

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

    const handleToggleLinks = () => {
        // Check authentication untuk menampilkan link
        if (!requireAuth("show")) return;
        setShowLinks(!showLinks);
    };

    if (validEpisodes.length === 0) {
        return null;
    }

    return (
        <>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-semibold text-white">
                        📋 Link Episode ({validEpisodes.length} episode)
                        {!isAuthenticated && <span className="text-yellow-400 text-xs ml-2">🔒 Terkunci</span>}
                    </h4>
                    <button
                        onClick={handleCopyAllLinks}
                        disabled={isCopied}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                            isCopied 
                                ? 'bg-green-600 text-white' 
                                : isAuthenticated
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                        title={!isAuthenticated ? "Klik untuk membuka dengan password" : ""}
                    >
                        {isCopied ? (
                            <>
                                <span>✅ Disalin!</span>
                            </>
                        ) : (
                            <>
                                <span>{isAuthenticated ? '📄' : '🔒'}</span>
                                {isAuthenticated ? 'Copy Semua Link' : 'Buka Akses'}
                            </>
                        )}
                    </button>
                </div>

                {/* Toggle untuk show/hide links - SEKARANG DIKUNCI JUGA */}
                <button
                    onClick={handleToggleLinks}
                    disabled={!isAuthenticated}
                    className={`flex items-center gap-2 text-sm mb-2 transition-colors ${
                        isAuthenticated 
                            ? 'text-gray-300 hover:text-white' 
                            : 'text-gray-500 cursor-not-allowed'
                    }`}
                    title={!isAuthenticated ? "Klik untuk membuka dengan password" : ""}
                >
                    <span>{showLinks ? '▼' : '▶'}</span>
                    {showLinks ? 'Sembunyikan Link' : 'Tampilkan Link'}
                    {!isAuthenticated && <span className="ml-1">🔒</span>}
                </button>

                {/* Box untuk menampilkan links */}
                {showLinks && isAuthenticated && (
                    <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                            {formattedLinks}
                        </pre>
                    </div>
                )}

                {/* Info jumlah episode */}
                <p className="text-xs text-gray-400 mt-2">
                    {validEpisodes.length} dari {episodes.length} episode memiliki link yang valid
                    {!isAuthenticated && (
                        <span className="text-yellow-400 block mt-1">
                            🔒 Masukkan password untuk menyalin atau menampilkan link
                        </span>
                    )}
                </p>
            </div>

            {/* Password Modal */}
            <PasswordModal
                isOpen={showPasswordModal}
                onClose={handleCloseModal}
                onSuccess={handleAuthSuccess}
                remainingAttempts={remainingAttempts}
                actionType={modalAction}
            />
        </>
    );
};

// Komponen Episode Button dengan sistem VIP
const EpisodeButton = ({ episode, isCurrent, onClick, episodeNumber, totalEpisodes }) => {
    const { requireVIPAccess } = useSecurity();
    const hasVIPAccess = securityService.hasVIPAccess();
    
    // Episode 1-5 gratis, episode 6+ butuh VIP
    const isLocked = episodeNumber > 5 && !hasVIPAccess;
    const isVIPOnly = episodeNumber > 5;

    const handleClick = () => {
        if (isLocked) {
            requireVIPAccess();
            return;
        }
        
        // Pastikan episode memiliki URL yang valid
        if (episode.url) {
            onClick(episode);
        } else {
            alert("Episode ini tidak memiliki URL yang valid");
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={!episode.url || isLocked}
            className={`
                w-full p-3 rounded text-center transition-all duration-200 text-sm font-medium relative
                ${isCurrent 
                    ? 'bg-red-600 text-white shadow-lg transform scale-105' 
                    : isLocked
                        ? 'bg-gray-900 text-gray-500 cursor-not-allowed opacity-70'
                        : episode.url 
                            ? 'bg-gray-700 hover:bg-gray-600 hover:shadow-md text-white' 
                            : 'bg-gray-900 text-gray-500 cursor-not-allowed opacity-50'
                }
            `}
            title={isLocked ? "Episode ini membutuhkan akses VIP" : episode.title}
        >
            {episode.title.replace('EP ', '')}
            {isVIPOnly && (
                <span className="absolute -top-1 -right-1 text-xs">
                    {isLocked ? '🔒' : '⭐'}
                </span>
            )}
        </button>
    );
};

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

// Main Player Component
export default function Player() {
    const location = useLocation();
    const navigate = useNavigate();
    const { bookId } = useParams();
    const videoRef = useRef(null);
    
    const {
        showVIPModal,
        requireVIPAccess,
        handleVIPSuccess,
        handleCloseVIPModal
    } = useSecurity();
    
    // Check jika user diblokir - harus dipanggil sebelum hooks lainnya
    const isBlocked = securityService.isUserBlocked();
    
    // Pindahkan semua hooks ke atas, sebelum conditional return
    const dramaData = useDramaData(bookId, location.state);

    const handleRetry = useCallback(() => {
        navigate(location.pathname, { 
            replace: true,
            state: { ...location.state, forceRefresh: Date.now() }
        });
    }, [navigate, location.pathname, location.state]);

    // State management untuk current episode
    const [state, setState] = useState({
        dramaInfo: null,
        episodes: [],
        currentEpisode: null,
        isLoading: true,
        error: null
    });

    const handleEpisodeChange = useCallback((episode) => {
        if (episode && episode.url) {
            console.log(`[LOG] Mengganti episode ke: ${episode.title}`, episode);
            setState(prev => ({ ...prev, currentEpisode: episode }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Episode ini tidak memiliki URL yang valid");
        }
    }, []);

    const handleVideoEnded = useCallback(() => {
        if (!state.currentEpisode || !state.episodes || state.episodes.length === 0) return;

        const currentIndex = state.episodes.findIndex(
            ep => ep.episodeNumber === state.currentEpisode.episodeNumber
        );

        if (currentIndex > -1 && currentIndex < state.episodes.length - 1) {
            const nextEpisode = state.episodes[currentIndex + 1];
            console.log(`[LOG] Auto-play episode: ${nextEpisode.title}`);
            handleEpisodeChange(nextEpisode);
        }
    }, [state.currentEpisode, state.episodes, handleEpisodeChange]);

    // Effect untuk mengupdate state ketika data berubah
    useEffect(() => {
        if (dramaData.dramaInfo && dramaData.episodes.length > 0 && dramaData.currentEpisode) {
            setState({
                dramaInfo: dramaData.dramaInfo,
                episodes: dramaData.episodes,
                currentEpisode: dramaData.currentEpisode,
                isLoading: dramaData.isLoading,
                error: dramaData.error
            });
        }
    }, [dramaData]);

    useEffect(() => {
        if (videoRef.current && state.currentEpisode?.url) {
            console.log(`[LOG] Memuat video: ${state.currentEpisode.title}`);
            videoRef.current.load();
            videoRef.current.play().catch(e => {
                console.log("Autoplay prevented:", e);
            });
        }
    }, [state.currentEpisode]);

    // Return BlockedScreen di awal, sebelum menggunakan data hooks
    if (isBlocked) {
        return <BlockedScreen />;
    }

    // Kemudian return states lainnya
    if (state.isLoading) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <Header onBack={() => navigate('/')} title="Loading..." />
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    if (state.error) {
        return (
            <div className="bg-gray-900 min-h-screen text-white">
                <div className="container mx-auto px-4 py-8">
                    <Header onBack={() => navigate('/')} title="Error" isError />
                    <ErrorMessage message={state.error} onRetry={handleRetry} />
                </div>
            </div>
        );
    }

    if (!state.dramaInfo || !state.currentEpisode || state.episodes.length === 0) {
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

    const hasVIPAccess = securityService.hasVIPAccess();
    const lockedEpisodesCount = state.episodes.filter((_, index) => index + 1 > 5).length;

    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Header 
                    onBack={() => navigate('/')} 
                    title={`${state.dramaInfo.title} - ${state.currentEpisode.title}`}
                />

                <VideoPlayer 
                    currentEpisode={state.currentEpisode}
                    videoRef={videoRef}
                    onEnded={handleVideoEnded}
                    onError={() => {
                        alert("Gagal memuat video. Silakan coba episode lain.");
                    }}
                />

                <div className="bg-gray-800 p-6 rounded-lg">
                    <p className="text-gray-300 mb-4 leading-relaxed">
                        {state.dramaInfo.description || "Tidak ada deskripsi tersedia."}
                    </p>
                    
                    {state.dramaInfo.category && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {state.dramaInfo.category.split(', ').map((tag, index) => (
                                <span key={index} className="bg-gray-700 text-xs px-3 py-1 rounded-full">
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    <div className="border-t border-gray-700 pt-4">
                        <CopyLinksBox episodes={state.episodes} />
                        
                        {/* VIP Info Banner */}
                        {!hasVIPAccess && lockedEpisodesCount > 0 && (
                            <div className="bg-purple-900 border border-purple-700 rounded-lg p-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-white mb-1">🎬 Akses VIP Diperlukan</h4>
                                        <p className="text-purple-200 text-sm">
                                            {lockedEpisodesCount} episode terkunci. Berlangganan VIP untuk menonton semua episode.
                                        </p>
                                    </div>
                                    <button
                                        onClick={requireVIPAccess}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        Berlangganan
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* VIP Status */}
                        {hasVIPAccess && (
                            <div className="bg-green-900 border border-green-700 rounded-lg p-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">⭐</span>
                                    <span className="text-green-200 text-sm font-medium">
                                        Akses VIP Aktif - Anda dapat menonton semua episode
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <h3 className="text-lg font-bold mb-4">
                            Daftar Episode ({state.episodes.length})
                            {!hasVIPAccess && lockedEpisodesCount > 0 && (
                                <span className="text-purple-400 text-sm ml-2">
                                    ({state.episodes.length - lockedEpisodesCount} gratis, {lockedEpisodesCount} VIP)
                                </span>
                            )}
                        </h3>
                        
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 overflow-y-auto pr-2">
                            {state.episodes.map((ep, index) => (
                                <EpisodeButton
                                    key={ep.episodeNumber}
                                    episode={ep}
                                    isCurrent={state.currentEpisode.episodeNumber === ep.episodeNumber}
                                    onClick={handleEpisodeChange}
                                    episodeNumber={index + 1}
                                    totalEpisodes={state.episodes.length}
                                />
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-600 rounded"></div>
                                <span>Sedang diputar</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-gray-700 rounded"></div>
                                <span>Episode gratis</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-gray-700 rounded relative">
                                    <span className="absolute -top-1 -right-1 text-xs">⭐</span>
                                </div>
                                <span>Episode VIP</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-gray-900 rounded relative">
                                    <span className="absolute -top-1 -right-1 text-xs">🔒</span>
                                </div>
                                <span>Terkunci</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VIP Modal */}
            <VIPModal
                isOpen={showVIPModal}
                onClose={handleCloseVIPModal}
                onSuccess={handleVIPSuccess}
            />
        </div>
    );
}