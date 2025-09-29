// server/lib/vipCodeGenerator.js
const fs = require('fs');
const path = require('path');

class VIPCodeGenerator {
    constructor() {
        this.dataFile = path.join(process.cwd(), 'vip_codes.save');
        this.initializeDataFile();
    }

    // Initialize data file jika belum ada
    initializeDataFile() {
        if (!fs.existsSync(this.dataFile)) {
            const initialData = {
                codes: [],
                packages: {
                    weekly: { price: 20000, duration: 7, name: '1 Minggu' },
                    monthly: { price: 50000, duration: 30, name: '1 Bulan' }
                },
                statistics: {
                    total_generated: 0,
                    total_activated: 0,
                    weekly_sold: 0,
                    monthly_sold: 0,
                    total_revenue: 0
                }
            };
            this.saveData(initialData);
        }
    }

    // Load data dari file
    loadData() {
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading VIP data:', error);
            return this.getDefaultData();
        }
    }

    // Save data ke file
    saveData(data) {
        try {
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving VIP data:', error);
            return false;
        }
    }

    // Default data structure
    getDefaultData() {
        return {
            codes: [],
            packages: {
                weekly: { price: 20000, duration: 7, name: '1 Minggu' },
                monthly: { price: 50000, duration: 30, name: '1 Bulan' }
            },
            statistics: {
                total_generated: 0,
                total_activated: 0,
                weekly_sold: 0,
                monthly_sold: 0,
                total_revenue: 0
            }
        };
    }

    // Generate random VIP code
    generateCode(packageType = 'weekly') {
        const prefix = packageType === 'weekly' ? 'VIPW' : 'VIPM';
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const code = `${prefix}${randomNum}`;
        
        const data = this.loadData();
        
        // Cek jika code sudah ada
        const existingCode = data.codes.find(c => c.code === code);
        if (existingCode) {
            return this.generateCode(packageType); // Generate ulang jika duplicate
        }

        const packageInfo = data.packages[packageType];
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + packageInfo.duration);

        const newCode = {
            code: code,
            package: packageType,
            price: packageInfo.price,
            duration: packageInfo.duration,
            generated_at: new Date().toISOString(),
            expires_at: expiryDate.toISOString(),
            activated: false,
            activated_at: null,
            activated_by: null
        };

        data.codes.push(newCode);
        data.statistics.total_generated++;
        
        if (packageType === 'weekly') {
            data.statistics.weekly_sold++;
        } else {
            data.statistics.monthly_sold++;
        }
        
        data.statistics.total_revenue += packageInfo.price;

        this.saveData(data);
        
        return {
            code: newCode.code,
            package: packageInfo.name,
            price: packageInfo.price,
            duration: packageInfo.duration,
            expires_at: newCode.expires_at
        };
    }

    // Validate VIP code
    validateCode(code) {
        const data = this.loadData();
        const vipCode = data.codes.find(c => c.code === code.toUpperCase());
        
        if (!vipCode) {
            return { valid: false, message: 'Kode VIP tidak ditemukan' };
        }

        if (vipCode.activated) {
            return { valid: false, message: 'Kode VIP sudah digunakan' };
        }

        const now = new Date();
        const expiryDate = new Date(vipCode.expires_at);
        
        if (now > expiryDate) {
            return { valid: false, message: 'Kode VIP sudah kadaluarsa' };
        }

        return { 
            valid: true, 
            message: 'Kode VIP valid',
            package: vipCode.package,
            duration: vipCode.duration
        };
    }

    // Activate VIP code
    activateCode(code, activatedBy = 'Unknown') {
        const data = this.loadData();
        const vipCode = data.codes.find(c => c.code === code.toUpperCase());
        
        if (!vipCode) {
            return { success: false, message: 'Kode VIP tidak ditemukan' };
        }

        if (vipCode.activated) {
            return { success: false, message: 'Kode VIP sudah digunakan' };
        }

        const now = new Date();
        const expiryDate = new Date(vipCode.expires_at);
        
        if (now > expiryDate) {
            return { success: false, message: 'Kode VIP sudah kadaluarsa' };
        }

        // Activate code
        vipCode.activated = true;
        vipCode.activated_at = now.toISOString();
        vipCode.activated_by = activatedBy;
        
        data.statistics.total_activated++;
        
        this.saveData(data);
        
        return { 
            success: true, 
            message: 'Kode VIP berhasil diaktifkan',
            package: vipCode.package,
            duration: vipCode.duration,
            expires_at: vipCode.expires_at
        };
    }

    // Get statistics
    getStatistics() {
        const data = this.loadData();
        return data.statistics;
    }

    // Get all codes (for admin)
    getAllCodes() {
        const data = this.loadData();
        return data.codes;
    }

    // Get active codes count
    getActiveCodesCount() {
        const data = this.loadData();
        return data.codes.filter(code => !code.activated).length;
    }
}

module.exports = VIPCodeGenerator;