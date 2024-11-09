require('dotenv').config()
const {google} = require('googleapis');

const OAuth2 = google.auth.OAuth2;

// const CLIENT_ID = '146342372837-u80nid38j6qb0u3nlr01mmtmnebvvjck.apps.googleusercontent.com'

// const CLIENT_SECRET = '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'

// const REDIRECT_URL = 'https://gootask.skillhub.biz/callback'

const oauth2Client = new OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);

module.exports = oauth2Client;
