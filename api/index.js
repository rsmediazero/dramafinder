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

// 1. Endpoint untuk mendapatkan drama terbaru - DEBUG VERSION
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
            
            // DEBUG: Tampilkan struktur lengkap response
            console.log(`[LATEST] === DEBUG RESPONSE STRUCTURE ===`);
            console.log(`[LATEST] Root keys:`, Object.keys(response.data));
            
            if (response.data.data) {
                console.log(`[LATEST] Data keys:`, Object.keys(response.data.data));
                
                // Cek columnVoList
                if (response.data.data.columnVoList) {
                    console.log(`[LATEST] columnVoList length:`, response.data.data.columnVoList.length);
                    
                    response.data.data.columnVoList.forEach((column, index) => {
                        console.log(`[LATEST] Column ${index}:`, {
                            columnId: column.columnId,
                            title: column.title,
                            hasBookList: !!column.bookList,
                            bookListLength: column.bookList ? column.bookList.length : 0
                        });
                        
                        if (column.bookList && column.bookList.length > 0) {
                            console.log(`[LATEST] BookList item 0 in column ${index}:`, {
                                bookId: column.bookList[0].bookId,
                                bookName: column.bookList[0].bookName,
                                hasBookId: !!column.bookList[0].bookId
                            });
                        }
                    });
                }
                
                // Cek recommendList
                if (response.data.data.recommendList) {
                    console.log(`[LATEST] recommendList records length:`, response.data.data.recommendList.records ? response.data.data.recommendList.records.length : 0);
                }
            }
            
            console.log(`[LATEST] === END DEBUG ===`);
            
            return response;
        };

        const response = await retryRequest(requestFn);
        const responseData = response.data;
        
        // Handle struktur response yang sebenarnya
        let dramaList = [];
        
        if (responseData && responseData.data) {
            console.log(`[LATEST] Processing data...`);
            
            // Struktur: data.columnVoList[].bookList[]
            if (responseData.data.columnVoList && Array.isArray(responseData.data.columnVoList)) {
                console.log(`[LATEST] Found ${responseData.data.columnVoList.length} columns`);
                
                // Extract semua bookList dari semua columnVoList
                responseData.data.columnVoList.forEach((column, index) => {
                    console.log(`[LATEST] Processing column ${index}: ${column.title}`);
                    
                    if (column.bookList && Array.isArray(column.bookList)) {
                        console.log(`[LATEST] Column ${index} has ${column.bookList.length} books`);
                        
                        // Filter hanya item yang memiliki bookId
                        const validBooks = column.bookList.filter(book => book && book.bookId);
                        console.log(`[LATEST] Column ${index} valid books: ${validBooks.length}`);
                        
                        dramaList = dramaList.concat(validBooks);
                    } else {
                        console.log(`[LATEST] Column ${index} has no bookList or bookList is not array`);
                    }
                });
                
                console.log(`[LATEST] Total extracted from columns: ${dramaList.length}`);
            } else {
                console.log(`[LATEST] No columnVoList found or not array`);
            }
            
            // Juga cek recommendList jika ada
            if (responseData.data.recommendList && responseData.data.recommendList.records && Array.isArray(responseData.data.recommendList.records)) {
                console.log(`[LATEST] Processing recommendList with ${responseData.data.recommendList.records.length} records`);
                
                const recommendDramas = responseData.data.recommendList.records.filter(item => item && item.bookId);
                console.log(`[LATEST] Valid recommend dramas: ${recommendDramas.length}`);
                
                dramaList = dramaList.concat(recommendDramas);
            }
            
            // Cek struktur lain yang mungkin
            const otherKeys = Object.keys(responseData.data).filter(key => 
                !['columnVoList', 'recommendList', 'bannerList', 'watchHistory', 'channelList', 'searchHotWords'].includes(key)
            );
            
            if (otherKeys.length > 0) {
                console.log(`[LATEST] Other potential data keys:`, otherKeys);
                
                otherKeys.forEach(key => {
                    const value = responseData.data[key];
                    if (Array.isArray(value) && value.length > 0) {
                        console.log(`[LATEST] Key "${key}" is array with ${value.length} items`);
                        const validItems = value.filter(item => item && item.bookId);
                        dramaList = dramaList.concat(validItems);
                    }
                });
            }
        } else {
            console.log(`[LATEST] No data in response or no response.data`);
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
        } else {
            console.log(`[LATEST] WARNING: No dramas found!`);
            console.log(`[LATEST] Raw dramaList length: ${dramaList.length}`);
            if (dramaList.length > 0) {
                console.log(`[LATEST] First dramaList item:`, dramaList[0]);
            }
        }
        
        // Format response yang konsisten
        res.json({
            success: true,
            data: {
                list: uniqueDramas,
                total: uniqueDramas.length,
                page: req.body.pageNo || 1
            },
            debug: {
                rawDramaCount: dramaList.length,
                uniqueDramaCount: uniqueDramas.length,
                structure: responseData.data ? Object.keys(responseData.data) : []
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
            const url = "https://sapi.dramaboxdb.com/drama-box/search/suggest";
            const headers = createHeaders(gettoken);
            const data = { keyword: keyword.trim() };
            
            console.log(`[SEARCH] Request data:`, data);
            
            const response = await axios.post(url, data, { 
                headers, 
                timeout: 15000 
            });
            
            console.log(`[SEARCH] Response status: ${response.status}`);
            console.log(`[SEARCH] Response keys:`, Object.keys(response.data));
            
            if (response.data.data) {
                console.log(`[SEARCH] Data type:`, Array.isArray(response.data.data) ? 'Array' : typeof response.data.data);
                console.log(`[SEARCH] Data keys:`, Object.keys(response.data.data));
            }
            
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
                    console.log(`[SEARCH] Using data from key: ${arrayKey}`);
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

// Debug endpoint untuk melihat response mentah
app.post('/api/debug-raw', async (req, res) => {
    try {
        const gettoken = await getCachedToken();
        const url = "https://sapi.dramaboxdb.com/drama-box/he001/theater";
        const headers = createHeaders(gettoken);
        const data = {
            newChannelStyle: 1,
            isNeedRank: 1,
            pageNo: 1,
            index: 0,
            channelId: 43
        };
        
        console.log(`[DEBUG] Getting raw response...`);
        
        const response = await axios.post(url, data, { 
            headers, 
            timeout: 15000 
        });
        
        // Return response mentah
        res.json({
            success: true,
            rawResponse: response.data,
            structure: {
                rootKeys: Object.keys(response.data),
                dataKeys: response.data.data ? Object.keys(response.data.data) : [],
                columnVoList: response.data.data && response.data.data.columnVoList ? {
                    length: response.data.data.columnVoList.length,
                    firstColumn: response.data.data.columnVoList[0] ? {
                        keys: Object.keys(response.data.data.columnVoList[0]),
                        bookList: response.data.data.columnVoList[0].bookList ? {
                            length: response.data.data.columnVoList[0].bookList.length,
                            firstItem: response.data.data.columnVoList[0].bookList[0]
                        } : null
                    } : null
                } : null
            }
        });
        
    } catch (error) {
        console.error("[DEBUG] Error:", error.message);
        res.json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend proxy berjalan di http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🎬 Latest dramas: POST http://localhost:${PORT}/api/latest`);
    console.log(`🔍 Search: POST http://localhost:${PORT}/api/search`);
    console.log(`🐛 Debug raw: POST http://localhost:${PORT}/api/debug-raw`);
    console.log(`📁 Sumber token: config.js`);
});

export default app;