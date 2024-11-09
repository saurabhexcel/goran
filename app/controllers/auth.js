const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
require('dotenv').config()

const knex = require("./../../knex/knex");
const {google} = require('googleapis')
const oauth2Client = require('../config/oauth2Client');

exports.verifyLogin = async (req, res, next) => {


    const token = req.cookies.jwt

    try {
        if (!token) { // token boş ise..
            res.render('login')
            // res.redirect("/login");
            // next()
        } else {
            jwt.verify(token, 'secretsecret', (err, decoded) => {
                if (err) {
                    res.status("not valid login here");
                    next()
                } else {

                    // if everything is good, save to request for use in other routes
                    req.decoded = decoded;
                    res.redirect('/dashboard');
                    next()
                }
            });
        }


    } catch (err) {
        // res.render('login')
        // res.redirect("/login");
    }

}



exports.getlogin = async (req, res) => {
    res.render('login', { errorMsg: '' })

}

exports.register = (req, res) => {
    console.log(req.body);

    const { email, username, password, repassword } = req.body;

    // dB.query('SELECT username FROM tblLogin WHERE username = ?', [username], async (error, results) => {
    //     if (error) {
    //         console.log(error);
    //     }

    //     if (results.length > 0) {
    //         return res.render('register', {
    //             message: 'That username is already in use'
    //         })

    //     }
    //     else if (password !== repassword) {
    //         return res.render('register'), {
    //             message: 'Password do not match!'
    //         }
    //     }

    //     let hashedPassword = await bcrypt.hash(password, 8);
    //     console.log(hashedPassword);

    //     dB.query('INSERT INTO tblLogin SET ?', { Username: username, Password: hashedPassword, Email: email }, (error, results) => {
    //         if (error) {
    //             console.log(error);
    //         } else {
    //             console.log(results);
    //             return res.render('register', {
    //                 message: 'User registered!'
    //             });
    //         }
    //     });
    // })
}

exports.googleLogin = (req, res) =>{
    
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/tasks.readonly','https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
    });

    res.redirect(authUrl);
}

exports.callbackFunction = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            // If no code is provided in the query string, redirect or send an error response.
            return res.status(400).send("Authorization code is missing");
        }

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const userInfo = await oauth2.userinfo.get();
 
        const email = userInfo.data.email;
        console.log(email);
        
        const userData = await knex('googleUsers').where({ email: email }).first();
        if(!userData){
            try {
                // Optionally, save the user info to the database if needed
               await knex('googleUsers')
               .insert({ email, data:{} }) // or update as necessary

            } catch (error) {               
               res.status(500).send("failed to store in DB");
            }
        }

        // Store the email in the JWT for later access
        const token = jwt.sign({ email }, 'your_jwt_secret', { expiresIn: '24h' });
        res.cookie('jwt', token);
        
        // Redirect to the desired route after successful authentication
        res.redirect('/tasks/list');

    } catch (error) {

        console.error("Error during Google OAuth callback:", error);

        // Redirect or send a response in case of an error
        res.status(500).send("Authentication failed. Please try again.");
    }
}

exports.login = async (req, res) => {

    const { email, password } = req.body;

    if (!email) {
        return res.status(400).render('login', {
            errorMsg: 'Please provide an email and password!'
        })
    }

    try {
        const user = await knex('users').where({ 'email': email });
        if (user.length > 0) {
            // const authResult = await bcrypt.compare(password, user[0].password);
            // if (authResult) {
            const token = jwt.sign({ id: user[0].id }, 'secretsecret', {
                expiresIn: '24h'
            });
            res.cookie('jwt', token);
            res.status(200).redirect("/dashboard");
        }
        else {
            res.status(401).render('login', {
                errorMsg: 'Username is incorrect!'
            })
        }
    } catch (error) {
        res.render('login', { errorMsg: 'invalid credintial' });
    }

}

module.export= {oauth2Client}