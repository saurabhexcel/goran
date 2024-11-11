const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');



module.exports = {
    verifyToken: function (req, res, next) {

        const token = req.cookies.jwt

        try {
            if (!token) { // token boş ise..
                res.redirect("/login");
                next()
            }// cookiesde ki token kodu ile oluşturduğumuz secretkeyle kontrol et.

            jwt.verify(token, 'secretsecret', (err, decoded) => {
                if (err) {
                    console.error('JWT Verification failed:', err);
                    return res.status(401).json({ message: 'Invalid or expired token' });
                } else {

                    // if everything is good, save to request for use in other routes
                    req.decoded = decoded;
                    next();
                }
            });
        } catch (err) {

        }

    }
};