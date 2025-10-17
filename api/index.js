//BACKEND index.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { tokenConfig } from './config.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Token cache dengan perbaikan
let tokenCache = {
    data: null,
    timestamp: 0
};

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 menit

// Fungsi untuk mendapatkan token dengan error handling yang lebih baik
const getCachedToken = async ({ forceRefresh = false } = {}) => {
    const now = Date.now();
    
    if (!forceRefresh && tokenCache.data && (now - tokenCache.timestamp < CACHE_DURATION_MS)) {
        console.log("[LOG] Menggunakan token dari cache.");
        return tokenCache.data;
    }

    try {
        console.log(forceRefresh ? "[LOG] MEMAKSA mengambil token baru..." : "[LOG] Mengambil token baru (cache expired)...");
        
        const tokenData = {
            token: tokenConfig.token,
            deviceId: tokenConfig.deviceId
        };
        
        if (!tokenData.token || !tokenData.deviceId) {
            throw new Error("Token atau deviceId tidak valid di config.js");
        }
        
        tokenCache = {
            data: tokenData,
            timestamp: Date.now()
        };
        
        console.log("[LOG] Token dari config.js berhasil disimpan ke cache.");
        return tokenCache.data;
        
    } catch (error) {
        console.error("[ERROR] Gagal mendapatkan token dari config.js:", error.message);
        
        if (tokenCache.data) {
            console.log("[LOG] Menggunakan token lama karena gagal refresh.");
            return tokenCache.data;
        }
        
        throw new Error(`Gagal mendapatkan token: ${error.message}`);
    }
};

const createHeaders = (tokenData) => ({
    "User-Agent": "okhttp/4.10.0",
    "Accept-Encoding": "gzip",
    "tn": `Bearer ${tokenData.token}`,
    "version": "430",
    "vn": "4.3.0",
    "cid": "DRA1000042",
    "package-name": "com.storymatrix.drama",
    "apn": "1",
    "device-id": tokenData.deviceId,
    "language": "in",
    "current-language": "in",
    "p": "43",
    "time-zone": "+0800",
    "Content-Type": "application/json; charset=UTF-8"
});

// Fungsi helper untuk retry request
const retryRequest = async (requestFn, maxRetries = 2) => {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            console.log(`[LOG] Percobaan ${i + 1} gagal:`, error.message);
            
            if (i === maxRetries) {
                throw error;
            }
            
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                console.log("[LOG] Token mungkin invalid, force refresh...");
                tokenCache.timestamp = 0;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

// 1. Endpoint untuk mendapatkan drama terbaru - DIPERBAIKI UNTUK STRUKTUR BARU
app.post('/api/latest', async (req, res) => {
    try {
        const requestFn = async () => {
            const gettoken = await getCachedToken();
            const url = "https://sapi.dramaboxdb.com/drama-box/he001/theater";
            const headers = createHeaders(gettoken);
            const page = req.body.pageNo || 1;
            
            console.log(`[LATEST] Request halaman: ${page}`);
            
            const data = {
                newChannelStyle: 1,
                isNeedRank: 1,
                pageNo: parseInt(page),
                index: (parseInt(page) - 1) * 20,
                channelId: 43
            };
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[LATEST] Response status: ${response.status}`);
            
            return response;
        };

        const response = await retryRequest(requestFn);
        const responseData = response.data;
        
        // Handle struktur response yang sebenarnya
        let dramaList = [];
        
        if (responseData && responseData.data) {
            // Struktur: data.columnVoList[].bookList[]
            if (responseData.data.columnVoList && Array.isArray(responseData.data.columnVoList)) {
                // Extract semua bookList dari semua columnVoList
                responseData.data.columnVoList.forEach(column => {
                    if (column.bookList && Array.isArray(column.bookList)) {
                        dramaList = dramaList.concat(column.bookList);
                    }
                });
                
                console.log(`[LATEST] Berhasil mengekstrak ${dramaList.length} drama dari ${responseData.data.columnVoList.length} kolom`);
            }
            
            // Juga cek recommendList jika ada
            if (responseData.data.recommendList && responseData.data.recommendList.records && Array.isArray(responseData.data.recommendList.records)) {
                const recommendDramas = responseData.data.recommendList.records.filter(item => item.bookId);
                dramaList = dramaList.concat(recommendDramas);
                console.log(`[LATEST] Ditambahkan ${recommendDramas.length} drama dari rekomendasi`);
            }
        }
        
        // Hapus duplikat berdasarkan bookId
        const uniqueDramas = [];
        const seenBookIds = new Set();
        
        dramaList.forEach(drama => {
            if (drama.bookId && !seenBookIds.has(drama.bookId)) {
                seenBookIds.add(drama.bookId);
                uniqueDramas.push(drama);
            }
        });
        
        console.log(`[LATEST] Final unique dramas: ${uniqueDramas.length} items`);
        
        if (uniqueDramas.length > 0) {
            console.log(`[LATEST] Contoh drama pertama:`, {
                id: uniqueDramas[0].bookId,
                name: uniqueDramas[0].bookName,
                cover: uniqueDramas[0].coverWap,
                episodes: uniqueDramas[0].chapterCount
            });
        }
        
        // Format response yang konsisten
        res.json({
            success: true,
            data: {
                list: uniqueDramas,
                total: uniqueDramas.length,
                page: req.body.pageNo || 1
            }
        });
        
    } catch (error) {
        console.error("[ERROR] /api/latest:", error.message);
        
        if (error.response) {
            console.error("[ERROR] Response details:", {
                status: error.response.status,
                data: error.response.data
            });
        }
        
        // Return empty data instead of error
        res.json({
            success: true,
            data: {
                list: [],
                total: 0,
                page: req.body.pageNo || 1
            },
            error: error.message
        });
    }
});

// 2. Endpoint untuk pencarian - DIPERBAIKI
app.post('/api/search', async (req, res) => {
    const { keyword } = req.body;
    
    if (!keyword || keyword.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            message: "Keyword pencarian diperlukan." 
        });
    }

    try {
        console.log(`[SEARCH] Mencari: "${keyword}"`);
        
        const requestFn = async () => {
            const gettoken = await getCachedToken();
            const url = "https://sapi.dramaboxdb.com/drama-box/search/suggest";
            const headers = createHeaders(gettoken);
            const data = { keyword: keyword.trim() };
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[SEARCH] Response status: ${response.status}`);
            
            return response;
        };

        const response = await retryRequest(requestFn);
        const responseData = response.data;
        
        // Handle struktur response pencarian
        let searchResults = [];
        
        if (responseData && responseData.data) {
            if (Array.isArray(responseData.data)) {
                // Struktur langsung array
                searchResults = responseData.data;
            } else if (responseData.data.list && Array.isArray(responseData.data.list)) {
                // Struktur: { data: { list: [...] } }
                searchResults = responseData.data.list;
            } else if (responseData.data.books && Array.isArray(responseData.data.books)) {
                // Struktur: { data: { books: [...] } }
                searchResults = responseData.data.books;
            } else {
                // Cari field array pertama
                const keys = Object.keys(responseData.data);
                const arrayKey = keys.find(key => Array.isArray(responseData.data[key]));
                if (arrayKey) {
                    searchResults = responseData.data[arrayKey];
                }
            }
        }
        
        console.log(`[SEARCH] Final results: ${searchResults.length} items`);
        
        if (searchResults.length > 0) {
            console.log(`[SEARCH] Contoh hasil pertama:`, {
                id: searchResults[0].bookId,
                name: searchResults[0].bookName,
                cover: searchResults[0].coverWap
            });
        }
        
        // Return response yang konsisten
        res.json({
            success: true,
            data: searchResults,
            keyword: keyword
        });
        
    } catch (error) {
        console.error("[ERROR] /api/search:", error.message);
        
        if (error.response) {
            console.error("[ERROR] Response error:", {
                status: error.response.status,
                data: error.response.data
            });
        }
        
        // Return empty results instead of error
        res.json({
            success: true,
            data: [],
            keyword: keyword,
            error: error.message
        });
    }
});

// 3. Endpoint untuk mendapatkan link stream - TETAP SAMA
app.post('/api/stream-link', async (req, res) => {
    const { bookId } = req.body;
    if (!bookId) {
        return res.status(400).json({ 
            success: false, 
            message: "bookId diperlukan." 
        });
    }

    try {
        console.log(`[STREAM] Memulai untuk bookId: ${bookId}`);
        
        const requestFn = async () => {
            const gettoken = await getCachedToken({ forceRefresh: true });
            const url = "https://sapi.dramaboxdb.com/drama-box/chapterv2/batch/load";
            const headers = createHeaders(gettoken);
            
            const baseData = {
                boundaryIndex: 0,
                comingPlaySectionId: -1,
                currencyPlaySource: "discover_new_rec_new",
                needEndRecommend: 0,
                currencyPlaySourceName: "",
                preLoad: false,
                rid: "",
                pullCid: "",
                loadDirection: 0,
                startUpKey: "",
                bookId: String(bookId),
            };

            const initialRequestData = { ...baseData, index: 1 };
            
            const response = await axios.post(url, initialRequestData, { 
                headers,
                timeout: 20000 
            });
            
            console.log(`[STREAM] Response status: ${response.status}`);
            
            return response;
        };

        const initialResponse = await retryRequest(requestFn);
        const initialData = initialResponse.data ? initialResponse.data.data : null;
        
        if (!initialData || !initialData.chapterList || initialData.chapterList.length === 0) {
            console.warn(`[STREAM] Tidak ada episode ditemukan untuk bookId: ${bookId}`);
            return res.json({ 
                success: true, 
                episodes: [],
                bookId: bookId 
            });
        }

        const firstBatch = initialData.chapterList;
        const totalEpisodes = initialData.chapterCount;
        const batchSize = firstBatch.length;
        let allEpisodes = [...firstBatch];

        console.log(`[STREAM] Batch pertama: ${firstBatch.length} episode`);
        console.log(`[STREAM] Total episode: ${totalEpisodes}`);

        // Ambil episode tambahan jika ada
        if (totalEpisodes > batchSize) {
            console.log(`[STREAM] Mengambil episode tambahan...`);
            
            const additionalRequestFn = async (nextIndex) => {
                const gettoken = await getCachedToken({ forceRefresh: true });
                const headers = createHeaders(gettoken);
                const requestData = { 
                    boundaryIndex: 0,
                    comingPlaySectionId: -1,
                    currencyPlaySource: "discover_new_rec_new",
                    needEndRecommend: 0,
                    currencyPlaySourceName: "",
                    preLoad: false,
                    rid: "",
                    pullCid: "",
                    loadDirection: 0,
                    startUpKey: "",
                    bookId: String(bookId),
                    index: nextIndex 
                };
                
                const response = await axios.post(
                    "https://sapi.dramaboxdb.com/drama-box/chapterv2/batch/load", 
                    requestData, 
                    { headers, timeout: 20000 }
                );
                
                return response;
            };

            const requests = [];
            for (let nextIndex = batchSize + 1; nextIndex <= totalEpisodes; nextIndex += batchSize) {
                requests.push(retryRequest(() => additionalRequestFn(nextIndex)));
            }

            const additionalResponses = await Promise.all(requests);
            additionalResponses.forEach(response => {
                const chapterList = response.data && response.data.data ? response.data.data.chapterList : null;
                if (chapterList) {
                    allEpisodes.push(...chapterList);
                }
            });
        }

        // Process episodes
        const processedEpisodes = allEpisodes.map((chapter, index) => {
            try {
                const cdnData = chapter.cdnList ? chapter.cdnList[0] : null;
                const videoList = cdnData ? cdnData.videoPathList : null;
                
                if (!videoList || videoList.length === 0) {
                    return null;
                }
                
                let streamUrl = null;
                const defaultVideo = videoList.find(video => video.isDefault === 1);
                if (defaultVideo && defaultVideo.videoPath) {
                    streamUrl = defaultVideo.videoPath;
                } else if (videoList[0] && videoList[0].videoPath) {
                    streamUrl = videoList[0].videoPath;
                }
                
                if (!streamUrl) {
                    return null;
                }
                
                return {
                    episodeNumber: chapter.chapterId || index + 1,
                    title: chapter.chapterName || `Episode ${index + 1}`,
                    url: streamUrl,
                };
            } catch (error) {
                console.log(`[STREAM] Error processing episode ${index}:`, error.message);
                return null;
            }
        }).filter(ep => ep && ep.url);

        processedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        
        console.log(`[STREAM] Berhasil memproses ${processedEpisodes.length} episode`);
        
        res.json({ 
            success: true, 
            episodes: processedEpisodes,
            bookId: bookId 
        });
        
    } catch (error) {
        console.error(`[ERROR] /api/stream-link untuk bookId ${bookId}:`, error.message);
        
        res.json({ 
            success: true, 
            episodes: [],
            bookId: bookId,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const cacheAge = Date.now() - tokenCache.timestamp;
    const isCacheValid = cacheAge < CACHE_DURATION_MS;
    
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        tokenCache: {
            age: cacheAge,
            valid: isCacheValid,
            hasToken: !!tokenCache.data,
            hasDeviceId: !!tokenCache.data ? !!tokenCache.data.deviceId : false
        },
        tokenSource: 'config.js'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend proxy berjalan di http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🎬 Latest dramas: POST http://localhost:${PORT}/api/latest`);
    console.log(`🔍 Search: POST http://localhost:${PORT}/api/search`);
    console.log(`📁 Sumber token: config.js`);
});

export default app;