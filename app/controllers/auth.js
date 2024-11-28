const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const axios = require('axios')
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
        scope: ['https://www.googleapis.com/auth/tasks.readonly','https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/tasks'],
    });

    res.redirect(authUrl);
}

exports.loginViaGoogle = (req, res) =>{

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/tasks.readonly','https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/tasks'],
    });

    res.redirect(authUrl);
}

exports.callbackFunction = async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send("Authorization code is missing");
        }

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;

        let userData = await knex('googleUsers').where({ email }).first();

        if (!userData) {
            // New user, save email and tokens
            await knex('googleUsers').insert({
                email,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                data: JSON.stringify({}),
            });
        } else {
            // Existing user, update tokens
            await knex('googleUsers')
                .where({ email })
                .update({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token || userData.refresh_token, // Save only if refresh_token is provided
                });
        }

        const jwtToken = jwt.sign({ email }, 'secretsecret', { expiresIn: '1h' });
        res.cookie('jwt', jwtToken);
        res.redirect(`/tasks/list?token=${jwtToken}`);

    } catch (error) {
        console.error("Error during Google OAuth callback:", error);
        res.status(500).send("Authentication failed. Please try again.");
    }
};


exports.getAccessToken = async (req, res)=>{
    const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'please provide an email' });
  }

  let userData = await knex('googleUsers').where({ email }).first();
  console.log(userData,"============useedata")

  if(!userData){
    res.status(400).json({ success: false, message: 'data not found' });
  }
  const { refresh_token } = userData

  try {
    // Request a new access token from Google
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.CLIENT_ID, // Replace with your Google client ID
      client_secret: process.env.CLIENT_SECRET, // Replace with your Google client secret
      refresh_token: refresh_token,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = response.data;
    userData.accessToken = access_token;

    const jwtToken = jwt.sign({ email }, 'secretsecret', { expiresIn: '1h' });
    res.cookie('jwt', jwtToken);
    res.status(200).json({ success: true, message: 'access Token genrated successfully',token:jwtToken })
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh access token',
      error: error.response?.data || error.message,
    });
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
            res.cookie('email',email)
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