const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Create uploads folder
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Database setup
const db = new sqlite3.Database('./eyfel.db');

// Create tables
db.serialize(() => {
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT NOT NULL,
        stock_status TEXT DEFAULT 'In Stock',
        image_url TEXT,
        description TEXT
    )`);

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_location TEXT NOT NULL,
        product_id INTEGER,
        product_name TEXT,
        quantity INTEGER,
        total_price REAL,
        order_date TEXT,
        payment_status TEXT DEFAULT 'Pending'
    )`);

    // Admin table
    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL
    )`);

    // Insert default admin
    db.get(`SELECT * FROM admin WHERE username = 'admin'`, (err, row) => {
        if (!row) {
            db.run(`INSERT INTO admin (username, password) VALUES ('admin', 'eyfel2024')`);
            console.log('✅ Admin user created: admin / eyfel2024');
        }
    });
    
    // Add sample products if none exist
    db.get(`SELECT * FROM products LIMIT 1`, (err, row) => {
        if (!row) {
            const sampleProducts = [
                ['Luxury Rose Perfume', 250, 'Perfume', 'In Stock', null, 'Premium rose fragrance long-lasting perfume'],
                ['Oud Wood Diffuser', 180, 'Diffuser', 'In Stock', null, 'Luxury oud fragrance for home'],
                ['Vanilla Bliss', 220, 'Perfume', 'In Stock', null, 'Sweet vanilla perfume oil'],
                ['Lavender Spa Diffuser', 150, 'Diffuser', 'In Stock', null, 'Relaxing lavender aromatherapy']
            ];
            
            sampleProducts.forEach(product => {
                db.run(`INSERT INTO products (name, price, category, stock_status, image_url, description) VALUES (?, ?, ?, ?, ?, ?)`, product);
            });
            console.log('✅ Sample products added');
        }
    });
});

// API Routes
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY id DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, price, category, stock_status, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    
    db.run(`INSERT INTO products (name, price, category, stock_status, image_url, description)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [name, price, category, stock_status, image_url, description],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Product added successfully' });
        });
});

app.put('/api/products/:id', (req, res) => {
    const { stock_status } = req.body;
    db.run(`UPDATE products SET stock_status = ? WHERE id = ?`,
        [stock_status, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Product updated successfully' });
        });
});

app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, req.params.id, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Product deleted successfully' });
    });
});

app.get('/api/orders', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY order_date DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/orders', (req, res) => {
    const { customer_name, customer_phone, customer_location, product_id, product_name, quantity, total_price } = req.body;
    const order_date = new Date().toISOString();
    
    db.run(`INSERT INTO orders (customer_name, customer_phone, customer_location, product_id, product_name, quantity, total_price, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_name, customer_phone, customer_location, product_id, product_name, quantity, total_price, order_date],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Order placed successfully' });
        });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', username);
    
    db.get(`SELECT * FROM admin WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ success: false, message: 'Server error' });
            return;
        }
        if (row) {
            console.log('✅ Login successful for:', username);
            res.json({ success: true, message: 'Login successful' });
        } else {
            console.log('❌ Login failed for:', username);
            res.json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 EYFEL GHANA Server Running!');
    console.log('=================================');
    console.log(`📱 Main Shop: http://localhost:${PORT}`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/admin.html`);
    console.log('=================================\n');
});