'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res, next) => {
  const from = req.query.from;
  if (from) {
    res.cookie('loginFrom', from, { expires: new Date(Date.now() + 600000)});
  }
  if (req.isAuthenticated()) {
    res.redirect('/');
    return;
  }
  res.render('login')
});

module.exports = router;
