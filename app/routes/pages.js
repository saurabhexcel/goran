const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares');
const knex = require("./../../knex/knex");
const jwt = require('jsonwebtoken');

const getTokenFromCookies = (req) => {
    return req.cookies.jwt || null;
};

// Helper function to get user ID from token
const getUserIdFromToken = (req) => {
    const token = getTokenFromCookies(req);
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, 'secretsecret');
        return decoded.id;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Routers  
router.get('/', verifyToken, async (req, res, next) => {

    try {

        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).send('Unauthorized: Invalid token');
        }


        const lists = await knex('lists').where('userId', userId).select('*');

        const sublists = await knex('sublists').select('*');

        res.render('dashboard', {
            baselists: lists?.length > 0 ? lists : [],
            basesublists: sublists?.length > 0 ? sublists : []
        })

    } catch (error) {
        // res.render('index', { error: 'invalid credintial' });
    }

})

router.post('/delete/:id', verifyToken, async (req, res, next) => {

    try {
        const { id } = req.params;

        await knex('sublists')
            .where('id', id)
            .del();
        res.redirect('/dashboard');
    } catch (error) {
        // res.render('index', { error: 'invalid credintial' });
    }

})

router.post('/add-item', verifyToken, async (req, res, next) => {

    const { listid, listName } = req.body;

    try {
        const [id] = await knex('sublists').insert({ listid: listid, name: listName });
        res.json({ success: true, listId: id });
        // res.redirect('/dashboard');
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).send('An error occurred');
    }

})

router.get('/login', (req, res) => {
    res.render('login')
})

router.get('/register', (req, res) => {
    res.render('register')
})

module.exports = router;