var express = require('express'),
  router = express.Router(),
  { middleware: accessControl } = require('../local_modules/accessControl'),
  enhanceRes = require('../local_modules/enhanceResponse');

router.route('/settings').get(
  accessControl(),
  enhanceRes(),
  (req, res) => {
    res.render('users/settings', {
      title: 'Settings',
    });
  }
);

module.exports = router;
