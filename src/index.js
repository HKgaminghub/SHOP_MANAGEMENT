const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const otpGenerator = require('otp-generator');
const session = require('express-session');

const { adminCollection } = require("./confing"); 
const { stockCollection } = require("./confing"); 
const { orderCollection } = require("./confing"); 
const { OTPCollection } = require("./confing"); 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hardbosamiya9b@gmail.com', 
        pass: 'jsbw quqt tkul zoft' 
    }
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session middleware
app.use(session({
    secret: 'yourSecretKey', // You can change this to a random string for better security
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

app.set('view engine', 'ejs');
app.use(express.static("public"));

console.log("adminCollection Model:", adminCollection);
console.log("stockCollection Model:", stockCollection);
console.log("orderCollection Model:", orderCollection);
console.log("OTPCollection Model:", OTPCollection);

// Home route
app.get("/", async (req, res) => {
    try {
        const products = await stockCollection.find({}, { image: 1, buyingPrice: 1, sellingPrice: 1, productName: 1, productId: 1 }).limit(100);  // Fetch first 100 products

        res.render("home", { products, USERNAME: req.session.username });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching products.");
    }
});

// Logout route
app.get("/logout", async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Error destroying session:", err);
            return res.status(500).send("Error logging out.");
        }
        res.send(`
            <html>
                <body>
                    <p>Logging out.....</p>
                    <script>
                        setTimeout(() => {
                            document.getElementById('redirectForm').submit();
                        }, 1000); // 1-second delay
                    </script>
                    <form id="redirectForm" action="/" method="get">
                    </form>
                </body>
            </html>
        `);
    });
});

// Login form route
app.get("/login", (req, res) => {
    res.render("login");
});

// Orders page route
app.post("/orders", async (req, res) => {
    res.render("orders");
});

// Product page route
app.post("/order", async (req, res) => {
    const { productId } = req.body;
    const product = await stockCollection.findById(productId); 

    res.render("order", {
        productName: product.productName,
        image: product.image,
        buyingPrice: product.buyingPrice
    });
});

// Signup route
app.post("/signup", async (req, res) => {
    try {
        const data = {
            name: req.body.name,
            password: req.body.password,
            email: " ",
            userType: "user" 
        };

        const existingUser = await adminCollection.findOne({ name: data.name });

        if (existingUser) {
            return res.send("User already exists. Please choose a different name.");
        }

        const saltRounds = 10;
        data.password = await bcrypt.hash(data.password, saltRounds);

        await adminCollection.create(data);
        console.log("User registered:", data.name);

        res.redirect("/"); 
    } catch (error) {
        console.error(error);
        res.status(500).send("Error registering user.");
    }
});

// Signup page route
app.get("/signup", async (req, res) => {
    return res.render("signup");
});

// Login POST route
app.post("/login", async (req, res) => {
    if (req.body.which == 1) {
        const orders = await orderCollection.find({}, { _id: 1, userName: 1, productName: 1, quantity: 1, Address: 1, phoneNumber: 1 });
        return res.render("orders", { orders });
    }

    if (req.body.which == 2) {
        const products = await stockCollection.find({}, { _id: 1, productName: 1, quantity: 1, buyingPrice: 1, sellingPrice: 1, category: 1, quantityType: 1, image: 1 });
        const modifiedProducts = products.map(product => ({
            ...product._doc,
            image: product.image ? `data:image/png;base64,${product.image.toString('base64')}` : null
        }));

        return res.render("myproduct", { products: modifiedProducts });
    }

    try {
        const user = await adminCollection.findOne({ name: req.body.name });

        if (!user) {
            return res.send("User not found.");
        }

        const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);

        if (isPasswordMatch) {
            req.session.username = req.body.name; // Set the username in the session
            if (user.userType == "admin") {
                return res.render("admin");
            } else {
                return res.redirect("/");
            }
        } else {
            return res.send("Wrong password.");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Error logging in.");
    }
});

// Admin actions route
app.post("/admin", upload.single("image"), async (req, res) => {
    console.log("Headers:", req.headers);
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file); 

    if (!req.file) {
        return res.status(400).send("No image uploaded.");
    }

    const data = {
        productName: req.body.productName,
        quantity: req.body.quantity,
        buyingPrice: req.body.buyingPrice,
        sellingPrice: req.body.sellingPrice,
        category: req.body.category,
        quantityType: req.body.quantityType,
        image: req.file.buffer
    };

    await stockCollection.create(data);
    console.log("Product added successfully!");
    return res.send("Product added successfully!");
});

// Place order route
app.post("/orderPlace", async (req, res) => {
    const data = {
        userName: req.session.username, // Use session to get the username
        productName: req.body.productName,
        quantity: req.body.quantity,
        Address: req.body.Address,
        phoneNumber: req.body.phoneNumber
    }

    const { phoneNumber } = req.body;
    if (!req.session.username) {
        return res.send(`
            <html>
                <body>
                    <p>You are not logged in. Please login first.</p>
                    <script>
                        setTimeout(() => {
                            document.getElementById('redirectForm').submit();
                        }, 1000); // 1-second delay
                    </script>
                    <form id="redirectForm" action="/login" method="get">
                    </form>
                </body>
            </html>
        `);
    } else {
        if (phoneNumber.toString().length !== 10) {
            return res.send("Invalid phone number");
        } else {
            orderCollection.create(data);
        }
        return res.render("orderplaced");
    }
});

// OTP request route
app.post("/req-otp", async (req, res) => {
    res.render("req-otp");
});

// OTP sending route
app.post("/send-otp", async (req, res) => {
    const name = req.body.user;
    const user = await adminCollection.findOne({ name });

    if (!user) {
        return res.send("The username doesn't exist.");
    }

    if (user.email == " ") {
        return res.send("There is no email registered with this username.");
    }

    const otp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    console.log(otp);

    const email = user.email; 
    const deletes = await OTPCollection.deleteMany({ email: user.email });

    await OTPCollection.create({ email: user.email, otp: otpHash, expiresAt });

    const mailOptions = {
        from: 'hardbosamiya9b@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is ${otp}. It expires in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            return res.status(500).send("Error sending OTP");
        }
        console.log("OTP sent: " + info.response);
        res.status(200).send(`<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OTP-Verification</title>
                <link rel="stylesheet" href="/style.css">
            </head>
            <body>
                <div class="form-container-admin">
                    <h2>Admin Panel</h2>
                    <form action="/verify" method="post">
                        <div class="form-group">
                            <label for="OTP">OTP:</label>
                            <input type="text" name="OTP" placeholder="Enter OTP" required autocomplete="off">
                            <input type="hidden" name="email" value="${email}">
                        </div>
                        <button type="submit" class="submit-btn">Verify</button>
                    </form>
                </div>
            </body>
            </html>`);
    });
});

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});
