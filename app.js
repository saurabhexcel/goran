var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const passport = require('passport');
const fs = require('fs').promises;
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const OAuth2 = google.auth.OAuth2;

require('dotenv').config()


var app = express();

app.use(session({secret: 'cats'}));
app.use(passport.initialize());
app.use(passport.session());



// view engine setup

app.set('views', path.join(__dirname, 'app/views'));

app.set('view engine', 'ejs');



app.use(logger('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));



// app.use(express.json());



// app.use('/', indexRouter);

// app.use('/users', usersRouter);



app.use('/', require('./app/routes/auth'));

app.use('/tasks', require('./app/routes/task'));

app.use('/dashboard', require('./app/routes/pages'));

app.use('/auth', require('./app/routes/auth'));



// app.use((req, res, next) => {

//   res.status(404).render('404');

// });



// // catch 404 and forward to error handler

// app.use(function (req, res, next) {

//   next(createError(404));

// });



// error handler

app.use(function (err, req, res, next) {

  // set locals, only providing error in development

  res.locals.message = err.message;

  res.locals.error = req.app.get('env') === 'development' ? err : {};



  // render the error page

  res.status(err.status || 500);

  res.render('error');

});



app.get('/logout', (req, res) => {

  req.session.destroy();

  res.redirect("/");

});

/*

// Replace these with your own credentials email: gtg.ste2@gmail.com     pass: M3!-^"/7r2%lffff

// const REDIRECT_URL = 'https://gootask.skillhub.biz/callback';



const oauth2Client = new OAuth2(

    process.env.CLIENT_ID,

    process.env.CLIENT_SECRET,

    process.env.REDIRECT_URL

);



// Generate a URL for the user to authenticate

app.get('/auth_google', (req, res) => {

    const authUrl = oauth2Client.generateAuthUrl({

        access_type: 'offline',

        scope: ['https://www.googleapis.com/auth/tasks.readonly'],

    });

    res.redirect(authUrl);

});



// Handle the OAuth2 callback

/* app.get('/google/callback', async (req, res) => {

    const { code } = req.query;

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    res.redirect('/tasks');

}); 

app.get('/callback', async (req, res) => {

    try {

        const { code } = req.query;

        if (!code) {

            // If no code is provided in the query string, redirect or send an error response.

            return res.status(400).send("Authorization code is missing");

        }



        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);



        // Redirect to the desired route after successful authentication

        res.redirect('/tasks');

    } catch (error) {

        console.error("Error during Google OAuth callback:", error);



        // Redirect or send a response in case of an error

        res.status(500).send("Authentication failed. Please try again.");

}

});



// Fetch the task list

app.get('/tasks', async (req, res) => {
    
    const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

    const taskLists = await tasksApi.tasklists.list();

    const allTasks = [];



    for (const taskList of taskLists.data.items) {

        const tasks = await tasksApi.tasks.list({ tasklist: taskList.id });

        allTasks.push(...tasks.data.items);

    }



    res.json(allTasks);

});
*/


module.exports = app;

