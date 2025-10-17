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
    
    // Cek cache, TAPI abaikan jika forceRefresh true
    if (!forceRefresh && tokenCache.data && (now - tokenCache.timestamp < CACHE_DURATION_MS)) {
        console.log("[LOG] Menggunakan token dari cache.");
        return tokenCache.data;
    }

    try {
        console.log(forceRefresh ? "[LOG] MEMAKSA mengambil token baru..." : "[LOG] Mengambil token baru (cache expired)...");
        
        // GUNAKAN DATA DARI config.js BUKAN DARI API EKSTERNAL
        const tokenData = {
            token: tokenConfig.token,
            deviceId: tokenConfig.deviceId
        };
        
        if (!tokenData.token || !tokenData.deviceId) {
            throw new Error("Token atau deviceId tidak valid di config.js");
        }
        
        // Update cache
        tokenCache = {
            data: tokenData,
            timestamp: Date.now()
        };
        
        console.log("[LOG] Token dari config.js berhasil disimpan ke cache.");
        console.log("[LOG] Token:", tokenData.token.substring(0, 20) + "...");
        console.log("[LOG] Device ID:", tokenData.deviceId);
        
        return tokenCache.data;
        
    } catch (error) {
        console.error("[ERROR] Gagal mendapatkan token dari config.js:", error.message);
        
        // Jika masih ada token lama (meskipun expired), coba gunakan dulu
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
            
            // Force refresh token untuk retry berikutnya
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log("[LOG] Token mungkin invalid, force refresh...");
                tokenCache.timestamp = 0; // Reset timestamp untuk force refresh
            }
            
            // Tunggu sebentar sebelum retry
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

// 1. Endpoint untuk mendapatkan drama terbaru
app.post('/api/latest', async (req, res) => {
    try {
        const requestFn = async () => {
            const gettoken = await getCachedToken();
            const url = "https://sapi.dramaboxdb.com/drama-box/he001/theater";
            const headers = createHeaders(gettoken);
            const page = req.body.pageNo || 1;
            
            console.log(`[LATEST] Halaman: ${page}`);
            console.log(`[LATEST] Token: ${gettoken.token ? '✅' : '❌'}`);
            console.log(`[LATEST] Device ID: ${gettoken.deviceId ? '✅' : '❌'}`);
            
            const data = {
                newChannelStyle: 1,
                isNeedRank: 1,
                pageNo: parseInt(page),
                index: (parseInt(page) - 1) * 20,
                channelId: 43
            };
            
            console.log(`[LATEST] Request data:`, JSON.stringify(data).substring(0, 100) + "...");
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[LATEST] Response status: ${response.status}`);
            console.log(`[LATEST] Data received: ${response.data ? '✅' : '❌'}`);
            
            return response;
        };

        const response = await retryRequest(requestFn);
        res.json(response.data);
        
    } catch (error) {
        console.error("[ERROR] /api/latest:", error.message);
        
        if (error.response) {
            console.error("[ERROR] Response details:", {
                status: error.response.status,
                data: error.response.data
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: "Gagal mengambil data drama terbaru.", 
            error: error.message,
            details: error.response?.data || null
        });
    }
});

// 2. Endpoint untuk pencarian
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
            console.log(`[SEARCH] Token: ${gettoken.token ? '✅ Ada' : '❌ Tidak ada'}`);
            console.log(`[SEARCH] Device ID: ${gettoken.deviceId ? '✅ Ada' : '❌ Tidak ada'}`);
            
            const url = "https://sapi.dramaboxdb.com/drama-box/search/suggest";
            const headers = createHeaders(gettoken);
            
            console.log(`[SEARCH] Headers tn: ${headers.tn ? '✅ Ada' : '❌ Tidak ada'}`);
            console.log(`[SEARCH] Headers device-id: ${headers['device-id'] ? '✅ Ada' : '❌ Tidak ada'}`);
            
            const data = { keyword: keyword.trim() };
            console.log(`[SEARCH] Request data:`, data);
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[SEARCH] Response status: ${response.status}`);
            console.log(`[SEARCH] Response data keys:`, Object.keys(response.data));
            
            if (response.data && response.data.data) {
                console.log(`[SEARCH] Jumlah hasil: ${response.data.data.length || 0}`);
                console.log(`[SEARCH] Hasil:`, response.data.data.slice(0, 3)); // Log 3 hasil pertama
            }
            
            return response;
        };

        const response = await retryRequest(requestFn);
        
        if (!response.data) {
            throw new Error("Response tidak memiliki data");
        }
        
        res.json(response.data);
        
    } catch (error) {
        console.error("[ERROR] /api/search:", error.message);
        console.error("[ERROR] Stack:`, error.stack);
        
        if (error.response) {
            console.error("[ERROR] Response error:", {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: "Gagal melakukan pencarian.", 
            error: error.message,
            details: error.response?.data || null
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
            
            console.log(`[STREAM] Token: ${gettoken.token ? '✅' : '❌'}`);
            console.log(`[STREAM] Device ID: ${gettoken.deviceId ? '✅' : '❌'}`);
            
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
            
            console.log(`[STREAM] Request data:`, JSON.stringify(initialRequestData));
            
            return await axios.post(url, initialRequestData, { 
                headers,
                timeout: 20000 
            });
        };

        const initialResponse = await retryRequest(requestFn);
        const initialData = initialResponse.data?.data;
        
        console.log(`[STREAM] Initial response:`, initialData ? '✅' : '❌');
        
        if (!initialData || !initialData.chapterList || initialData.chapterList.length === 0) {
            throw new Error("Daftar episode tidak ditemukan.");
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
                
                return await axios.post(
                    "https://sapi.dramaboxdb.com/drama-box/chapterv2/batch/load", 
                    requestData, 
                    { headers, timeout: 20000 }
                );
            };

            const requests = [];
            for (let nextIndex = batchSize + 1; nextIndex <= totalEpisodes; nextIndex += batchSize) {
                requests.push(retryRequest(() => additionalRequestFn(nextIndex)));
            }

            const additionalResponses = await Promise.all(requests);
            additionalResponses.forEach(response => {
                const chapterList = response.data?.data?.chapterList;
                if (chapterList) {
                    allEpisodes.push(...chapterList);
                    console.log(`[STREAM] Ditambahkan ${chapterList.length} episode`);
                }
            });
        }

        // Process episodes
        const processedEpisodes = allEpisodes.map(chapter => {
            const cdnData = chapter.cdnList?.[0];
            const videoList = cdnData?.videoPathList;
            
            if (!videoList || videoList.length === 0) return null;
            
            let streamUrl = videoList.find(video => video.isDefault === 1)?.videoPath || videoList[0]?.videoPath;
            
            return {
                episodeNumber: chapter.chapterId,
                title: chapter.chapterName,
                url: streamUrl,
            };
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
        
        const errorMessage = error.response ? 
            `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}` : 
            error.message;
            
        res.status(500).json({ 
            success: false, 
            message: "Gagal memproses link stream.", 
            error: errorMessage,
            bookId: bookId 
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
            hasDeviceId: !!tokenCache.data?.deviceId
        },
        tokenSource: 'config.js'
    });
});

// Endpoint untuk melihat info token
app.get('/token-info', (req, res) => {
    const isCached = tokenCache.data && (Date.now() - tokenCache.timestamp < CACHE_DURATION_MS);
    
    res.json({
        cached: isCached,
        cacheAge: tokenCache.timestamp ? Date.now() - tokenCache.timestamp : null,
        tokenExists: !!tokenCache.data,
        tokenPreview: tokenCache.data?.token ? tokenCache.data.token.substring(0, 20) + "..." : null,
        deviceId: tokenCache.data?.deviceId || null,
        deviceIdExists: !!tokenCache.data?.deviceId,
        lastUpdated: tokenCache.timestamp ? new Date(tokenCache.timestamp).toISOString() : null,
        config: {
            tokenExists: !!tokenConfig.token,
            deviceIdExists: !!tokenConfig.deviceId
        }
    });
});

// Endpoint untuk test token
app.get('/test-token', async (req, res) => {
    try {
        const tokenData = await getCachedToken();
        const headers = createHeaders(tokenData);
        
        // Test request sederhana
        const testUrl = "https://sapi.dramaboxdb.com/drama-box/he001/theater";
        const testData = {
            newChannelStyle: 1,
            isNeedRank: 1,
            pageNo: 1,
            index: 0,
            channelId: 43
        };
        
        console.log(`[TEST] Testing token dengan request...`);
        
        const response = await axios.post(testUrl, testData, { 
            headers, 
            timeout: 10000 
        });
        
        console.log(`[TEST] Response status: ${response.status}`);
        
        res.json({
            success: true,
            token: {
                exists: !!tokenData.token,
                deviceId: tokenData.deviceId,
                length: tokenData.token?.length,
                preview: tokenData.token?.substring(0, 20) + "..."
            },
            testRequest: {
                status: response.status,
                hasData: !!response.data,
                dataStructure: Object.keys(response.data || {})
            },
            message: "Token berhasil di-test"
        });
        
    } catch (error) {
        console.error(`[TEST] Error:`, error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            response: error.response?.data,
            tokenInfo: {
                exists: !!tokenCache.data,
                deviceId: tokenCache.data?.deviceId
            }
        });
    }
});

// Endpoint untuk mendapatkan token baru dari sumber asli
app.get('/get-new-token', async (req, res) => {
    try {
        console.log("[NEW_TOKEN] Mengambil token baru dari sumber asli...");
        const response = await axios.get("http://web.rsmediazero.my.id/dramabox", {
            timeout: 10000 
        });
        
        if (!response.data || !response.data.data.token || !response.data.data.deviceId) {
            throw new Error("Response token tidak valid");
        }
        
        const newToken = response.data.data;
        
        res.json({
            success: true,
            token: newToken.token,
            deviceId: newToken.deviceId,
            message: "Token baru berhasil diambil"
        });
        
    } catch (error) {
        console.error("[ERROR] Gagal mengambil token baru:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Gagal mengambil token baru dari sumber asli"
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend proxy berjalan di http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 Token info: http://localhost:${PORT}/token-info`);
    console.log(`🧪 Test token: http://localhost:${PORT}/test-token`);
    console.log(`🔄 Get new token: http://localhost:${PORT}/get-new-token`);
    console.log(`📁 Sumber token: config.js`);
});

export default app;