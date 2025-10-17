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

// 1. Endpoint untuk mendapatkan drama terbaru - DIPERBAIKI
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
            
            console.log(`[LATEST] Request data:`, JSON.stringify(data));
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[LATEST] Response status: ${response.status}`);
            console.log(`[LATEST] Full response structure:`, Object.keys(response.data));
            
            // DEBUG: Log seluruh response untuk analisis
            if (response.data) {
                console.log(`[LATEST] Response success:`, response.data.success);
                console.log(`[LATEST] Response message:`, response.data.message);
                console.log(`[LATEST] Response status:`, response.data.status);
                
                // Cari field yang berisi data drama
                const allKeys = Object.keys(response.data);
                const possibleDataKeys = allKeys.filter(key => {
                    const value = response.data[key];
                    return value && typeof value === 'object' && !['status', 'message', 'timestamp', 'ip', 'region', 'path', 'success'].includes(key);
                });
                
                console.log(`[LATEST] Possible data keys:`, possibleDataKeys);
                
                if (possibleDataKeys.length > 0) {
                    possibleDataKeys.forEach(key => {
                        console.log(`[LATEST] Key "${key}":`, typeof response.data[key], Array.isArray(response.data[key]) ? `Array(${response.data[key].length})` : 'Not array');
                        if (Array.isArray(response.data[key]) && response.data[key].length > 0) {
                            console.log(`[LATEST] Contoh item dari "${key}":`, response.data[key][0]);
                        }
                    });
                }
            }
            
            return response;
        };

        const response = await retryRequest(requestFn);
        
        // Handle berbagai kemungkinan struktur response
        let dramaList = [];
        let responseData = response.data;
        
        if (responseData) {
            // Coba berbagai kemungkinan struktur
            if (responseData.data && Array.isArray(responseData.data)) {
                // Struktur: { data: [...] }
                dramaList = responseData.data;
            } else if (responseData.data && responseData.data.list && Array.isArray(responseData.data.list)) {
                // Struktur: { data: { list: [...] } }
                dramaList = responseData.data.list;
            } else if (responseData.list && Array.isArray(responseData.list)) {
                // Struktur: { list: [...] }
                dramaList = responseData.list;
            } else if (responseData.books && Array.isArray(responseData.books)) {
                // Struktur: { books: [...] }
                dramaList = responseData.books;
            } else {
                // Cari field array pertama yang berisi data
                const keys = Object.keys(responseData);
                const arrayKey = keys.find(key => Array.isArray(responseData[key]) && 
                    key !== 'message' && 
                    key !== 'status' && 
                    !key.includes('time'));
                
                if (arrayKey) {
                    dramaList = responseData[arrayKey];
                    console.log(`[LATEST] Menggunakan data dari key: ${arrayKey}`);
                }
            }
        }
        
        console.log(`[LATEST] Final drama list: ${dramaList.length} items`);
        
        // Format response yang konsisten
        res.json({
            success: true,
            data: {
                list: dramaList,
                total: dramaList.length,
                page: req.body.pageNo || 1
            },
            originalResponse: responseData // Untuk debugging
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
            
            console.log(`[SEARCH] Mengirim request...`);
            console.log(`[SEARCH] Request data:`, data);
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[SEARCH] Response status: ${response.status}`);
            console.log(`[SEARCH] Full response keys:`, Object.keys(response.data));
            
            // DEBUG: Log detail response
            if (response.data) {
                console.log(`[SEARCH] Response success:`, response.data.success);
                console.log(`[SEARCH] Response message:`, response.data.message);
                
                // Cari semua keys yang mungkin berisi data
                const allKeys = Object.keys(response.data);
                console.log(`[SEARCH] All keys in response:`, allKeys);
                
                allKeys.forEach(key => {
                    const value = response.data[key];
                    if (value && typeof value === 'object') {
                        console.log(`[SEARCH] Key "${key}":`, Array.isArray(value) ? `Array(${value.length})` : 'Object');
                        if (Array.isArray(value) && value.length > 0) {
                            console.log(`[SEARCH] Contoh dari "${key}":`, value[0]);
                        }
                    }
                });
            }
            
            return response;
        };

        const response = await retryRequest(requestFn);
        
        // Handle berbagai kemungkinan struktur response
        let searchResults = [];
        let responseData = response.data;
        
        if (responseData) {
            // Coba berbagai kemungkinan struktur
            if (Array.isArray(responseData)) {
                // Struktur: [...]
                searchResults = responseData;
            } else if (responseData.data && Array.isArray(responseData.data)) {
                // Struktur: { data: [...] }
                searchResults = responseData.data;
            } else if (responseData.data && responseData.data.list && Array.isArray(responseData.data.list)) {
                // Struktur: { data: { list: [...] } }
                searchResults = responseData.data.list;
            } else if (responseData.list && Array.isArray(responseData.list)) {
                // Struktur: { list: [...] }
                searchResults = responseData.list;
            } else if (responseData.suggest && Array.isArray(responseData.suggest)) {
                // Struktur: { suggest: [...] }
                searchResults = responseData.suggest;
            } else if (responseData.results && Array.isArray(responseData.results)) {
                // Struktur: { results: [...] }
                searchResults = responseData.results;
            } else {
                // Cari field array pertama yang berisi data
                const keys = Object.keys(responseData);
                const arrayKey = keys.find(key => 
                    Array.isArray(responseData[key]) && 
                    responseData[key].length > 0 &&
                    typeof responseData[key][0] === 'object' &&
                    responseData[key][0].bookId !== undefined
                );
                
                if (arrayKey) {
                    searchResults = responseData[arrayKey];
                    console.log(`[SEARCH] Menggunakan data dari key: ${arrayKey}`);
                }
            }
        }
        
        console.log(`[SEARCH] Final results: ${searchResults.length} items`);
        
        // Return response yang konsisten
        res.json({
            success: true,
            data: searchResults,
            keyword: keyword,
            originalResponse: responseData // Untuk debugging
        });
        
    } catch (error) {
        console.error("[ERROR] /api/search:", error.message);
        
        if (error.response) {
            console.error("[ERROR] Response error:`, {
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

// 3. Endpoint untuk mendapatkan link stream
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
            
            console.log(`[STREAM] Mengirim request...`);
            
            const response = await axios.post(url, initialRequestData, { 
                headers,
                timeout: 20000 
            });
            
            console.log(`[STREAM] Response status: ${response.status}`);
            
            // DEBUG: Log response structure
            if (response.data) {
                console.log(`[STREAM] Response keys:`, Object.keys(response.data));
                if (response.data.data) {
                    console.log(`[STREAM] Data keys:`, Object.keys(response.data.data));
                    console.log(`[STREAM] Chapter count:`, response.data.data.chapterCount);
                    console.log(`[STREAM] Chapter list length:`, response.data.data.chapterList ? response.data.data.chapterList.length : 0);
                }
            }
            
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
                
                console.log(`[STREAM] Request tambahan index: ${nextIndex}`);
                
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
                    console.log(`[STREAM] Ditambahkan ${chapterList.length} episode`);
                }
            });
        }

        // Process episodes dengan error handling
        const processedEpisodes = allEpisodes.map((chapter, index) => {
            try {
                const cdnData = chapter.cdnList ? chapter.cdnList[0] : null;
                const videoList = cdnData ? cdnData.videoPathList : null;
                
                if (!videoList || videoList.length === 0) {
                    console.log(`[STREAM] Episode ${index} tidak memiliki video list`);
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
                    console.log(`[STREAM] Episode ${index} tidak memiliki URL`);
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

// Endpoint untuk debug response structure
app.post('/api/debug-structure', async (req, res) => {
    const { endpoint, data } = req.body;
    
    if (!endpoint) {
        return res.status(400).json({ 
            success: false, 
            message: "Endpoint diperlukan." 
        });
    }

    try {
        const gettoken = await getCachedToken();
        const headers = createHeaders(gettoken);
        const requestData = data || {};
        
        console.log(`[DEBUG] Testing endpoint: ${endpoint}`);
        console.log(`[DEBUG] Request data:`, requestData);
        
        const response = await axios.post(endpoint, requestData, { 
            headers, 
            timeout: 15000 
        });
        
        console.log(`[DEBUG] Full response for ${endpoint}:`, JSON.stringify(response.data, null, 2));
        
        // Analisis struktur
        const analyzeObject = (obj, path = 'root') => {
            const result = {
                path: path,
                type: typeof obj,
                isArray: Array.isArray(obj),
                keys: Array.isArray(obj) ? `Array(${obj.length})` : Object.keys(obj)
            };
            
            if (Array.isArray(obj) && obj.length > 0) {
                result.firstItem = analyzeObject(obj[0], `${path}[0]`);
            } else if (typeof obj === 'object' && obj !== null) {
                result.children = {};
                Object.keys(obj).forEach(key => {
                    result.children[key] = analyzeObject(obj[key], `${path}.${key}`);
                });
            }
            
            return result;
        };
        
        res.json({
            success: true,
            endpoint: endpoint,
            requestData: requestData,
            responseStatus: response.status,
            fullResponse: response.data,
            structureAnalysis: analyzeObject(response.data)
        });
        
    } catch (error) {
        console.error("[DEBUG] Error:", error.message);
        res.json({
            success: false,
            error: error.message,
            response: error.response ? error.response.data : null
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend proxy berjalan di http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🐛 Debug structure: http://localhost:${PORT}/api/debug-structure`);
    console.log(`📁 Sumber token: config.js`);
});

export default app;