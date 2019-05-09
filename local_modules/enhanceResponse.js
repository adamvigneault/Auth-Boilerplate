const { waterfall } = require('async'),
  { getObj: getAcl } = require('./accessControl');

// Enhance response object
function enhanceResponse() {
  return (req, res, next) => {
    // Pass messaging to response
    Object.assign(res.locals, req.flash());

    if (req.isAuthenticated()) {
      // Pass the user object to response
      res.locals.userProfile = req.user;
      res.locals.returnTo = req.session.returnTo;

      waterfall([
        (done) => {
          done();
        }
      ], async (err) => {
        try {
          if (err) throw err;
          /*
          res.locals.userAcl = await getAcl().allowedPermissions(req.user.id, [
            '/'
          ]);
          */
          res.locals.query = req.query;

          next();
        } catch (err) {
          next(err);
        }
      });
    } else {
      next();
    }
  };
}

module.exports = enhanceResponse;
