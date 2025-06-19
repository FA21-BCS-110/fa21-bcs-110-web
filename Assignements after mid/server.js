const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

let express = require('express');
let app = express();
let ejslayout = require('express-ejs-layouts');
app.set('view engine', 'ejs');
app.use(ejslayout);
app.set('layout', 'layout'); 
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

mongoose.connect('mongodb://localhost:27017/WebProject', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB: WebProject'))
.catch((err) => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    image: String,
    price: Number,
    description: String
});
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: Number
        }
    ],
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Vehicle Schema
const vehicleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, required: true }, // e.g., sedan, SUV, truck
    image: { type: String } // path to image file
});
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Multer setup for vehicle images
const vehicleStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/images/vehicles'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadVehicleImage = multer({ storage: vehicleStorage });

function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.redirect('/admin/login');
    }
    User.findById(req.session.adminId)
        .then(user => {
            if (user && user.isAdmin) {
                next();
            } else {
                res.status(403).send('Access denied. Admin privileges required.');
            }
        })
        .catch(err => {
            res.status(500).send('Server error');
        });
}

function renderHomepage(req, res, options = {}) {
    if (!options.products) options.products = [];
    if (!options.title) options.title = 'Home Page';
    // Merge res.locals into options so user and cart are always available
    options = { ...res.locals, ...options };
    res.render('homepage', options);
}

app.get('/', async function (req, res) {
    const products = await Product.find();
    renderHomepage(req, res, { products });
});

app.get('/homepage', async function (req, res) {
    const products = await Product.find();
    renderHomepage(req, res, { products });
});

app.get('/signup', function (req, res) {
    res.render('signup', {
        title: 'Sign Up'
    });
});

app.get('/login', function (req, res) {
    res.render('login', {
        title: 'Login'
    });
});

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        req.session.userId = user._id;
        res.redirect('/');
    } catch (err) {
        const products = await Product.find();
        renderHomepage(req, res, { products, error: 'Email already exists.' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.render('login', { title: 'Login', error: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.render('login', { title: 'Login', error: 'Invalid credentials.' });
    }
    req.session.userId = user._id;
    // Remove admin session if present
    delete req.session.adminId;
    res.redirect('/');
});

app.post('/logout', (req, res) => {
    delete req.session.userId;
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us' });
});

app.get('/product/:id', isAuthenticated, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');
    res.render('product', { title: product.name, product });
});

// Seed products if none exist
async function seedProducts() {
    const count = await Product.countDocuments();
    if (count === 0) {
        await Product.insertMany([
            {
                name: 'Studios Long Liner Coat',
                image: '/images/StudiosLongCoat.jpg',
                price: 99.99,
                description: 'A stylish long liner coat for all seasons.'
            },
            {
                name: 'Oversized Cricket Jumper',
                image: '/images/cricket.jpg',
                price: 59.99,
                description: 'Comfortable oversized jumper with cricket style.'
            },
            {
                name: 'Everest Bomber Jacket',
                image: '/images/Fleece1.jpg',
                price: 120.00,
                description: 'Warm and durable bomber jacket for winter.'
            }
        ]);
        console.log('Sample products seeded.');
    }
}

// Create admin user if none exists
async function createAdminUser() {
    const adminExists = await User.findOne({ isAdmin: true });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await User.create({
            name: 'Admin User',
            email: 'admin@superdry.com',
            password: hashedPassword,
            isAdmin: true
        });
        console.log('Admin user created: admin@superdry.com / admin123');
    }
}

// Initialize data
async function initializeData() {
    await seedProducts();
    await createAdminUser();
}
initializeData();

// /my-orders route (protected)
app.get('/my-orders', isAuthenticated, async (req, res) => {
    const orders = await Order.find({ userId: req.session.userId }).populate('items.productId');
    res.render('my-orders', { title: 'My Orders', orders });
});

// Catch-all error handler for homepage.ejs
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err && err.view && err.view.endsWith('homepage.ejs')) {
        renderHomepage(req, res, { error: 'An unexpected error occurred.' });
    } else {
        next(err);
    }
});

// --- CART & CHECKOUT MIDDLEWARE ---
app.use((req, res, next) => {
    // Ensure cart is always an array
    if (!req.session.cart) req.session.cart = [];
    // Calculate total for cart
    const total = req.session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Make cart and total available to all views
    res.locals.cart = req.session.cart;
    res.locals.total = total;
    
    // Set user context for views
    if (req.session.adminId) {
        User.findById(req.session.adminId)
            .then(user => {
                res.locals.user = user;
                res.locals.isAdmin = true;
                next();
            })
            .catch(() => {
                res.locals.user = null;
                res.locals.isAdmin = false;
                next();
            });
    } else if (req.session.userId) {
        User.findById(req.session.userId)
            .then(user => {
                res.locals.user = user;
                res.locals.isAdmin = false;
                next();
            })
            .catch(() => {
                res.locals.user = null;
                res.locals.isAdmin = false;
                next();
            });
    } else {
        res.locals.user = null;
        res.locals.isAdmin = false;
        next();
    }
});

app.post('/cart/add/:productId', isAuthenticated, async (req, res) => {
    const { productId } = req.params;
    const quantity = parseInt(req.body.quantity) || 1;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');
    let cart = req.session.cart;
    let existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            name: product.name,
            price: product.price,
            quantity: quantity
        });
    }
    req.session.cart = cart;
    res.redirect('back');
});

app.get('/cart', isAuthenticated, (req, res) => {
    res.render('cart', {
        title: 'Your Cart',
        cart: req.session.cart,
        total: req.session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        message: req.query.message || null
    });
});

app.post('/cart/update/:productId', isAuthenticated, (req, res) => {
    const { productId } = req.params;
    const quantity = parseInt(req.body.quantity);
    let cart = req.session.cart;
    let item = cart.find(item => item.productId === productId);
    if (item && quantity > 0) {
        item.quantity = quantity;
        req.session.cart = cart;
        res.redirect('/cart?message=Quantity updated');
    } else if (item && quantity <= 0) {
        req.session.cart = cart.filter(item => item.productId !== productId);
        res.redirect('/cart?message=Item removed');
    } else {
        res.redirect('/cart?message=Item not found');
    }
});

app.post('/cart/remove/:productId', isAuthenticated, (req, res) => {
    const { productId } = req.params;
    let cart = req.session.cart;
    req.session.cart = cart.filter(item => item.productId !== productId);
    res.redirect('/cart?message=Item removed');
});

app.get('/checkout', isAuthenticated, (req, res) => {
    if (!req.session.cart.length) {
        return res.render('checkout', { cart: [], total: 0, message: 'Your cart is empty.' });
    }
    res.render('checkout', {
        cart: req.session.cart,
        total: req.session.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        message: null
    });
});


const orderSchemaV2 = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String,
    address: String,
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            name: String,
            price: Number,
            quantity: Number
        }
    ],
    total: Number,
    status: { type: String, default: 'Pending' },
    orderDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});
const OrderV2 = mongoose.models.OrderV2 || mongoose.model('OrderV2', orderSchemaV2);

app.post('/checkout', isAuthenticated, async (req, res) => {
    const { name, phone, address } = req.body;
    const cart = req.session.cart;
    if (!cart || !cart.length) {
        return res.render('checkout', { cart: [], total: 0, message: 'Your cart is empty.' });
    }
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Save order
    await OrderV2.create({
        userId: req.session.userId,
        name,
        phone,
        address,
        items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total,
        status: 'Pending',
        orderDate: new Date()
    });
    req.session.cart = [];
    res.render('checkout', { cart: [], total: 0, message: 'Order placed successfully! We will contact you soon.' });
});


app.get('/admin', isAdmin, async (req, res) => {
    const productCount = await Product.countDocuments();
    const orderCount = await OrderV2.countDocuments();
    const userCount = await User.countDocuments();
    res.render('admin/dashboard', { 
        title: 'Admin Dashboard',
        productCount,
        orderCount,
        userCount,
        layout: 'admin/layout'
    });
});

// Product Management Routes
app.get('/admin/products', isAdmin, async (req, res) => {
    const products = await Product.find();
    res.render('admin/products', { 
        title: 'Manage Products',
        products,
        message: req.query.message,
        error: req.query.error,
        layout: 'admin/layout'
    });
});

app.get('/admin/products/add', isAdmin, (req, res) => {
    res.render('admin/product-form', { 
        title: 'Add Product',
        product: null,
        layout: 'admin/layout'
    });
});

app.post('/admin/products/add', isAdmin, async (req, res) => {
    let { name, price, description, image } = req.body;
    // Helper: prepend /images/ if local filename is given
    if (image && !image.startsWith('/images/') && !image.startsWith('http://') && !image.startsWith('https://')) {
        image = '/images/' + image.replace(/^\/+/, '');
    }
    try {
        await Product.create({ name, price: parseFloat(price), description, image });
        res.redirect('/admin/products?message=Product added successfully');
    } catch (err) {
        res.render('admin/product-form', { 
            title: 'Add Product',
            product: null,
            error: 'Error adding product',
            layout: 'admin/layout'
        });
    }
});

app.get('/admin/products/edit/:id', isAdmin, async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');
    res.render('admin/product-form', { 
        title: 'Edit Product',
        product,
        layout: 'admin/layout'
    });
});

app.post('/admin/products/edit/:id', isAdmin, async (req, res) => {
    let { name, price, description, image } = req.body;
    // Helper: prepend /images/ if local filename is given
    if (image && !image.startsWith('/images/') && !image.startsWith('http://') && !image.startsWith('https://')) {
        image = '/images/' + image.replace(/^\/+/, '');
    }
    try {
        await Product.findByIdAndUpdate(req.params.id, { 
            name, 
            price: parseFloat(price), 
            description, 
            image 
        });
        res.redirect('/admin/products?message=Product updated successfully');
    } catch (err) {
        const product = await Product.findById(req.params.id);
        res.render('admin/product-form', { 
            title: 'Edit Product',
            product,
            error: 'Error updating product',
            layout: 'admin/layout'
        });
    }
});

app.post('/admin/products/delete/:id', isAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin/products?message=Product deleted successfully');
    } catch (err) {
        res.redirect('/admin/products?error=Error deleting product');
    }
});

// Order Management Routes
app.get('/admin/orders', isAdmin, async (req, res) => {
    const orders = await OrderV2.find().populate('userId', 'name email');
    res.render('admin/orders', { 
        title: 'Manage Orders',
        orders,
        message: req.query.message,
        error: req.query.error,
        layout: 'admin/layout'
    });
});

app.post('/admin/orders/update-status/:id', isAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        await OrderV2.findByIdAndUpdate(req.params.id, { status });
        res.redirect('/admin/orders?message=Order status updated');
    } catch (err) {
        res.redirect('/admin/orders?error=Error updating order status');
    }
});

// --- ADMIN LOGIN ROUTES ---
app.get('/admin/login', (req, res) => {
    res.render('admin/login', { title: 'Admin Login' });
});

app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isAdmin: true });
    if (!user) {
        return res.render('admin/login', { title: 'Admin Login', error: 'Invalid admin credentials.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.render('admin/login', { title: 'Admin Login', error: 'Invalid admin credentials.' });
    }
    req.session.adminId = user._id;
    // Remove user session if present
    delete req.session.userId;
    res.redirect('/admin');
});

app.get('/admin/logout', (req, res) => {
    delete req.session.adminId;
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// Admin: List all vehicles
app.get('/admin/vehicles', isAdmin, async (req, res) => {
    const vehicles = await Vehicle.find();
    res.render('admin/vehicles', { title: 'Manage Vehicles', vehicles });
});

// Admin: Show form to create a new vehicle
app.get('/admin/vehicles/new', isAdmin, (req, res) => {
    res.render('admin/vehicle-form', { title: 'Add Vehicle', vehicle: {}, formAction: '/admin/vehicles/new', buttonText: 'Create' });
});

// Admin: Handle create vehicle
app.post('/admin/vehicles/new', isAdmin, uploadVehicleImage.single('image'), async (req, res) => {
    try {
        const { name, brand, price, type } = req.body;
        const image = req.file ? '/images/vehicles/' + req.file.filename : '';
        await Vehicle.create({ name, brand, price, type, image });
        res.redirect('/admin/vehicles');
    } catch (err) {
        res.render('admin/vehicle-form', { title: 'Add Vehicle', vehicle: req.body, formAction: '/admin/vehicles/new', buttonText: 'Create', error: 'Error creating vehicle.' });
    }
});

// Admin: Show form to edit a vehicle
app.get('/admin/vehicles/edit/:id', isAdmin, async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.redirect('/admin/vehicles');
    res.render('admin/vehicle-form', { title: 'Edit Vehicle', vehicle, formAction: '/admin/vehicles/edit/' + vehicle._id, buttonText: 'Update' });
});

// Admin: Handle edit vehicle
app.post('/admin/vehicles/edit/:id', isAdmin, uploadVehicleImage.single('image'), async (req, res) => {
    try {
        const { name, brand, price, type } = req.body;
        let update = { name, brand, price, type };
        if (req.file) {
            update.image = '/images/vehicles/' + req.file.filename;
        }
        await Vehicle.findByIdAndUpdate(req.params.id, update);
        res.redirect('/admin/vehicles');
    } catch (err) {
        const vehicle = await Vehicle.findById(req.params.id);
        res.render('admin/vehicle-form', { title: 'Edit Vehicle', vehicle, formAction: '/admin/vehicles/edit/' + req.params.id, buttonText: 'Update', error: 'Error updating vehicle.' });
    }
});

// Admin: Delete vehicle
app.post('/admin/vehicles/delete/:id', isAdmin, async (req, res) => {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.redirect('/admin/vehicles');
});

// Public: List all vehicles (read-only)
app.get('/vehicles', async (req, res) => {
    const vehicles = await Vehicle.find();
    res.render('vehicles', { title: 'Vehicles', vehicles });
});

app.listen(4000, 'localhost', function () {
    console.log('Server is running on http://localhost:4000');
});