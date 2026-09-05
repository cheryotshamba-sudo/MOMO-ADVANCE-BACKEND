require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const AUTOPAY_URL =
    "https://autopay.co.ke/api/global/uganda";

const AUTOPAY_SECRET_KEY =
    process.env.AUTOPAY_SECRET_KEY;


// Test that the server is running
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AUTOPAY Uganda backend is running"
    });
});


// Send Uganda STK Push
app.post("/api/payment", async (req, res) => {

    try {

        const { phone, amount } = req.body;

        if (!phone || !amount) {
            return res.status(400).json({
                success: false,
                message: "Phone number and amount are required"
            });
        }

        const cleanPhone = String(phone)
            .replace(/\s+/g, "")
            .replace(/^\+/, "");

        if (!/^256\d{9}$/.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Uganda phone number"
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment amount"
            });
        }

        const response = await axios.post(
            `${AUTOPAY_URL}/stk-push`,
            {
                phone: cleanPhone,
                amount: numericAmount
            },
            {
                headers: {
                    Authorization:
                        `Bearer ${AUTOPAY_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(
            "AUTOPAY RESPONSE:",
            response.data
        );

        res.json(response.data);

    } catch (error) {

        console.error(
            "AUTOPAY ERROR:",
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


// Check transaction status
app.get("/api/payment/status/:id", async (req, res) => {

    try {

        const transactionId = req.params.id;

        const response = await axios.get(
            `${AUTOPAY_URL}/status/${encodeURIComponent(transactionId)}`,
            {
                headers: {
                    Authorization:
                        `Bearer ${AUTOPAY_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(
            "AUTOPAY STATUS:",
            response.data
        );

        res.json(response.data);

    } catch (error) {

        console.error(
            "STATUS ERROR:",
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
        `AUTOPAY backend running on port ${PORT}`
    );
});
