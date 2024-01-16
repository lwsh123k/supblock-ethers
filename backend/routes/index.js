const express = require('express');
const publicKeyRoute = require('./publicKeyQuery');

const router = express.Router();

router.use('/', publicKeyRoute);

module.exports = router;
