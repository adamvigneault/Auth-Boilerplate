const express = require('express'),
  router = express.Router(),
  enhanceRes = require('../local_modules/enhanceResponse');

/* GET home page. */
router.get('/', enhanceRes(), async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      req.session.returnTo = req.originalUrl || req.url;

      res.render('index', {
        title: 'Auth boilerplate',
      });
    } else {
      throw Error('Unauthenticated'); // Redirect to sign in. See catch.
    }
  } catch (err) {
    req.session.returnTo = req.baseUrl;
    res.redirect('/auth/signin');
  }
});

module.exports = router;
