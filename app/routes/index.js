var express = require('express');
const knex = require("./../../knex/knex");
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'TODO ', error: '' });
});

router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await knex('users').where({ 'email': email });
    if (user.length > 0) {
      // const authResult = await bcrypt.compare(password, user[0].password);
      // if (authResult) {
      const token = jwt.sign({ id: user[0].id }, 'secretsecret', {
        expiresIn: '24h'
      });
      res.cookie('token', token);
      res.redirect('/dashboard');
      // res.render('dashboard', {
      //   name: user[0].name,
      //   email: user[0].email,
      //   age: user[0].age
      // });
      // } else {
      //   res.render('index', { error: 'invalid credintial' });
      //   // res.send('Auth Failed');
      // }
    } else {
      res.render('index', { error: 'invalid credintial' });
      res.send('Auth Failed');
    }
  } catch (error) {
    res.render('index', { error: 'invalid credintial' });
    // res.send('Auth Failed');
  }
});

module.exports = router;

