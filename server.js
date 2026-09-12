require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// OptimaPay Global API
const OPTIMAPAY_URL =
    "https://global.optimapaybridge.co.ke/api/v2";

const OPTIMAPAY_API_KEY =
    process.env.OPTIMAPAY_API_KEY;

const OPTIMAPAY_API_SECRET =
    process.env.OPTIMAPAY_API_SECRET;


// Test that the server is running
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "OptimaPay Global Uganda backend is running"
    });
});


// Send Uganda MTN/Airtel payment prompt
app.post("/api/payment", async (req, res) => {

    try {

        const { phone, amount } = req.body;

        if (!phone || !amount) {
            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required"
            });
        }

        // Clean phone number
        let cleanPhone = String(phone)
            .replace(/\s+/g, "")
            .replace(/^\+/, "");

        // Convert 0772XXXXXX -> 256772XXXXXX
        if (/^0\d{9}$/.test(cleanPhone)) {
            cleanPhone = "256" + cleanPhone.substring(1);
        }

        // Validate Uganda number
        if (!/^256\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Uganda phone number"
            });
        }

        const numericAmount = Number(amount);

        // OptimaPay minimum amount is 500
        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 500
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be at least UGX 500"
            });
        }

        // Unique reference for this payment
        const reference =
            "MOMO-" +
            Date.now() +
            "-" +
            Math.floor(Math.random() * 10000);

        // Your Render webhook URL
        const callbackUrl =
            `${process.env.BACKEND_URL}/api/webhook`;

        const response = await axios.post(
            `${OPTIMAPAY_URL}/collecto/initiate`,
            {
                phone: cleanPhone,
                amount: numericAmount,
                reference: reference,
                description: "MoMo Advanc Payment",
                callback_url: callbackUrl
            },
            {
                headers: {
                    "X-API-KEY": OPTIMAPAY_API_KEY,
                    "X-API-SECRET": OPTIMAPAY_API_SECRET,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }
        );

        console.log(
            "OPTIMAPAY INITIATE RESPONSE:",
            response.data
        );

        res.json(response.data);

    } catch (error) {

        console.error(
            "OPTIMAPAY INITIATE ERROR:",
            error.response?.data || error.message
        );

        res.status(
            error.response?.status || 500
        ).json({
            success: false,
            message:
                error.response?.data?.message ||
                "Unable to initiate payment"
        });
    }
});


// OptimaPay webhook
app.post("/api/webhook", (req, res) => {

    try {

        console.log(
            "OPTIMAPAY WEBHOOK:",
            req.body
        );

        const {
            event,
            transaction_id,
            reference,
            client_reference,
            amount,
            phone,
            status,
            completed_at
        } = req.body;

        console.log("Payment event:", event);
        console.log("Transaction ID:", transaction_id);
        console.log("Reference:", reference);
        console.log("Client Reference:", client_reference);
        console.log("Amount:", amount);
        console.log("Phone:", phone);
        console.log("Status:", status);
        console.log("Completed:", completed_at);

        // Always acknowledge the webhook
        return res.json({
            success: true,
            received: true
        });

    } catch (error) {

        console.error(
            "WEBHOOK ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Webhook processing error"
        });
    }
});


// Check transaction status
app.get("/api/payment/status/:id", async (req, res) => {

    try {

        const identifier = req.params.id;

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: "Transaction identifier is required"
            });
        }

        const response = await axios.get(
            `${OPTIMAPAY_URL}/collecto/status/${encodeURIComponent(identifier)}`,
            {
                headers: {
                    "X-API-KEY": OPTIMAPAY_API_KEY,
                    "X-API-SECRET": OPTIMAPAY_API_SECRET,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }
        );

        console.log(
            "OPTIMAPAY STATUS:",
            response.data
        );

        res.json(response.data);

    } catch (error) {

        console.error(
            "OPTIMAPAY STATUS ERROR:",
            error.response?.data || error.message
        );

        res.status(
            error.response?.status || 500
        ).json({
            success: false,
            message:
                error.response?.data?.message ||
                "Unable to check payment status"
        });
    }
});


app.listen(PORT, () => {
    console.log(
        `OptimaPay Global backend running on port ${PORT}`
    );
});
