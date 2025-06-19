// --- VEHICLE MODULE: Consolidated Backend & Frontend Code ---

// --- Dependencies ---
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// --- Vehicle Schema ---
const vehicleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    type: { type: String, required: true }, // e.g., sedan, SUV, truck
    image: { type: String } // path to image file
});
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// --- Multer setup for vehicle images ---
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

// --- Vehicle Routes (Express) ---
function registerVehicleRoutes(app, isAdmin) {
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
}

// --- EJS Templates as String Constants (for reference) ---

const VEHICLES_EJS = `
<div class="container mt-4">
  <h1>Vehicles</h1>
  <% if (vehicles.length === 0) { %>
    <div class="alert alert-info">No vehicles available.</div>
  <% } else { %>
    <div class="row">
      <% vehicles.forEach(vehicle => { %>
        <div class="col-md-4 mb-4">
          <div class="card h-100">
            <% if (vehicle.image) { %>
              <img src="<%= vehicle.image %>" class="card-img-top" alt="<%= vehicle.name %>" style="max-height:200px;object-fit:cover;">
            <% } %>
            <div class="card-body">
              <h5 class="card-title"><%= vehicle.name %></h5>
              <p class="card-text">
                <strong>Brand:</strong> <%= vehicle.brand %><br>
                <strong>Type:</strong> <%= vehicle.type %><br>
                <strong>Price:</strong> $<%= vehicle.price %>
              </p>
            </div>
          </div>
        </div>
      <% }) %>
    </div>
  <% } %>
</div>`;

const ADMIN_VEHICLE_FORM_EJS = `
<div class="container mt-4">
  <h1><%= title %></h1>
  <% if (typeof error !== 'undefined' && error) { %>
    <div class="alert alert-danger"><%= error %></div>
  <% } %>
  <form action="<%= formAction %>" method="POST" enctype="multipart/form-data">
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" class="form-control" id="name" name="name" value="<%= vehicle.name || '' %>" required>
    </div>
    <div class="form-group">
      <label for="brand">Brand</label>
      <input type="text" class="form-control" id="brand" name="brand" value="<%= vehicle.brand || '' %>" required>
    </div>
    <div class="form-group">
      <label for="type">Type</label>
      <input type="text" class="form-control" id="type" name="type" value="<%= vehicle.type || '' %>" placeholder="e.g., sedan, SUV, truck" required>
    </div>
    <div class="form-group">
      <label for="price">Price</label>
      <input type="number" class="form-control" id="price" name="price" value="<%= vehicle.price || '' %>" step="0.01" required>
    </div>
    <div class="form-group">
      <label for="image">Image</label>
      <% if (vehicle.image) { %>
        <div class="mb-2">
          <img src="<%= vehicle.image %>" alt="Current Image" style="max-width:120px;max-height:90px;">
        </div>
      <% } %>
      <input type="file" class="form-control-file" id="image" name="image" accept="image/*">
    </div>
    <button type="submit" class="btn btn-success"><%= buttonText %></button>
    <a href="/admin/vehicles" class="btn btn-secondary ml-2">Cancel</a>
  </form>
</div>`;

const ADMIN_VEHICLES_EJS = `
<div class="container mt-4">
  <h1>Manage Vehicles</h1>
  <a href="/admin/vehicles/new" class="btn btn-primary mb-3">Add Vehicle</a>
  <% if (vehicles.length === 0) { %>
    <div class="alert alert-info">No vehicles found.</div>
  <% } else { %>
    <table class="table table-bordered table-hover">
      <thead class="thead-dark">
        <tr>
          <th>Name</th>
          <th>Brand</th>
          <th>Type</th>
          <th>Price</th>
          <th>Image</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <% vehicles.forEach(vehicle => { %>
          <tr>
            <td><%= vehicle.name %></td>
            <td><%= vehicle.brand %></td>
            <td><%= vehicle.type %></td>
            <td>$<%= vehicle.price %></td>
            <td>
              <% if (vehicle.image) { %>
                <img src="<%= vehicle.image %>" alt="<%= vehicle.name %>" style="max-width:80px;max-height:60px;">
              <% } %>
            </td>
            <td>
              <a href="/admin/vehicles/edit/<%= vehicle._id %>" class="btn btn-sm btn-warning">Edit</a>
              <form action="/admin/vehicles/delete/<%= vehicle._id %>" method="POST" style="display:inline-block;" onsubmit="return confirm('Delete this vehicle?');">
                <button type="submit" class="btn btn-sm btn-danger">Delete</button>
              </form>
            </td>
          </tr>
        <% }) %>
      </tbody>
    </table>
  <% } %>
</div>`;

// --- Export ---
module.exports = {
    Vehicle,
    vehicleSchema,
    uploadVehicleImage,
    registerVehicleRoutes,
    VEHICLES_EJS,
    ADMIN_VEHICLE_FORM_EJS,
    ADMIN_VEHICLES_EJS
}; 