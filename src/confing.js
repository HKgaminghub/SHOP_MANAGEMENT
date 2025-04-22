require('dotenv').config();
const mongoose = require("mongoose");

const connection = mongoose.createConnection(process.env.MONGO_URI);

connection.on("connected", () => {
    console.log("✅ MongoDB connected successfully");
});

connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err.message);
});

// Define schemas
const LoginSchema = new mongoose.Schema({
    name: String,
    password: String,
    email: String,
    userType: String
});

const StockSchema = new mongoose.Schema({
    productName: String,
    quantity: Number,
    buyingPrice: Number,
    sellingPrice: Number,
    category: String,
    quantityType: String,
    image: Buffer
});

const OrderSchema = new mongoose.Schema({
    userName: String,
    productName: String,
    quantity: Number,
    Address: String,
    phoneNumber: Number
});

const OTPSchema = new mongoose.Schema({
    email: String,
    otp: String,
    expiresAt: Date
});

// Models
const adminCollection = connection.model("admin", LoginSchema);
const stockCollection = connection.model("stock", StockSchema);
const orderCollection = connection.model("order", OrderSchema);
const OTPCollection = connection.model("OTP", OTPSchema);

// Export models and connection
module.exports = { adminCollection, stockCollection, orderCollection, OTPCollection, connection };
