const express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  { authMessage } = require('../local_modules/mailer'),
  createError = require('http-errors'),
  crypto = require('crypto'),
  moment = require('moment-timezone'),
  jwt = require('jsonwebtoken'),
  Users = require('../models/users'),
  enhanceRes = require('../local_modules/enhanceResponse'),
  { middleware: accessControl } = require('../local_modules/accessControl');

// Local authentication
router.route('/signin')
  .get(
    enhanceRes(),
    (req, res) => {
      if (req.isAuthenticated()) {
        res.redirect(req.session.returnTo || '/');
      } else {
        res.render('auth/signin', {
          title: 'Sign in',
          account: req.query.account,
          keyPrompt: req.query.keyPrompt
        });
      }
    }
  )
  .post(
    passport.authenticate('local', {
      failureRedirect: './signin',
      failureFlash: true
    }),
    (req, res) => {
      res.format({
        html: () => {
          // Interactive Session
          res.redirect(req.session.returnTo || '/');
        },
        json: () => {
          // From API
          const token = jwt.sign(
            { data: req.user },
            process.env.KEY,
            { expiresIn: Number(process.env.SESSION_LENGTH) }
          );
          // Sessionless
          req.logout();
          res.json({
            success: true,
            token: ['Bearer', token].join(' ')
          });
        }
      });
    }
  );

router.route('/signout')
  .get(
    enhanceRes(),
    (req, res) => {
      // Destroy session
      req.logout();
      res.format({
        html: () => {
          res.redirect('/');
        },
        json: () => {
          res.json({
            success: true,
            message: 'Token removed.'
          });
        }
      });
    }
  );

router.route('/s3')
  .post(
    accessControl(),
    (req, res) => {
      const filename = req.body.title;

      res.json({
        key: filename,
        policy: s3UploadPolicy(),
        signature: s3UploadSignature()
      });

      // generate the policy document that amazon is expecting.
      function s3UploadPolicy() {
        /*
        // Example S3 V2 policy
        const policy = {
          expiration: new Date(Date.now() + (1 * 60 * 1000)).toISOString(),
          conditions: [
            { bucket: 'hewwn-media' },
            { key: filename },
            { acl: 'public-read' },
            { 'success-action-status': 200 },
            ['content-length-range', 0, 10485760],
          ]
        };
        */

        // Policy provided by fine-uploader plugin
        const policy = Object.assign({}, req.body);
        policy.conditions.concat([
          { bucket: process.env.CDN_BUCKET },
          ['content-length-range', 0, 10485760]
        ]);

        return Buffer.from(JSON.stringify(policy)).toString('base64');
      }

      // sign our request by Base64 encoding the policy document.
      // V2 requires sha1, v4 requires sha256. We're using V2
      function s3UploadSignature() {
        return crypto.createHmac('sha1', process.env.CDN_SECRET)
          .update(s3UploadPolicy()).digest('base64');
      }
    }
  );

// Google authentication
router.route('/google/:return?')
  .get(
    enhanceRes(),
    passport.authenticate('google', {
      callbackURL: `https://${process.env.HOST}/auth/google/return`,
      failureRedirect: `https://${process.env.HOST}/auth/signin`
    }),
    (err, req, res, next) => {
      // Stomp token error
      // TODO: Fixes symptom, not cause. Research further.
      if (err.name === 'TokenError') {
        res.redirect('./google');
      } else next();
    }, (req, res) => {
      res.redirect(req.session.returnTo || '/');
    }
  );

// Mirosoft authentication
router.route('/microsoft/:return?')
  .get(
    enhanceRes(),
    passport.authenticate('microsoft', {
      callbackURL: `https://${process.env.HOST}/auth/microsoft/return`,
      failureRedirect: `https://${process.env.HOST}/auth/signin`
    }),
    (err, req, res, next) => {
      // Stomp token error
      // TODO: Fixes symptom, not cause. Research further.
      if (err.name === 'TokenError') {
        res.redirect('./microsoft');
      } else next();
    }, (req, res) => {
      res.redirect(req.session.returnTo || '/');
    }
  );

// Account management
router.route('/signup')
  .get(
    enhanceRes(),
    (req, res) => {
      res.render('auth/signup', {
        title: 'Create account',
        user: false,
        account: req.query.account || '',
        timeZones: moment.tz.names()
      });
    }
  );


router.route('/verify/:token?')
  .get((req, res) => {
    var token = req.params.token
      || `${req.query.groupA}${req.query.groupB}`.toLowerCase();

    if (!req.isAuthenticated()) {
      Users.findOne({
        resetPassToken: token
      }).exec()
        .then((user) => {
          if (!user) {
            throw Error('User verified');
          }

          user.set({
            resetPassToken: undefined,
            active: true,
            provider: 'hewwn'
          });

          if (user.contact.email === process.env.GLOBAL_ADMIN) {
            user.set({ roles: ['sys_admin'] });
          }

          return user.save();
        })
        .then((user) => {
          req.login(user, () => res.redirect('/'));
        })
        .catch((err) => {
          res.format({
            html: () => {
              req.flash('error', err.message);
              res.redirect('/auth/signin');
            },
            json: () => {
              res.json(err);
            }
          });
        });
    } else {
      res.format({
        html: () => {
          res.redirect('/');
        },
        json: () => {
          res.json({
            success: true,
            message: 'User activated',
            data: req.user
          });
        }
      });
    }
  });


router.route('/reset/:token?')
  .get(
    enhanceRes(),
    (req, res) => {
      if (!req.isAuthenticated() && !req.params.token) {
        res.redirect('../signin');
      } else {
        res.render('auth/reset', {
          title: 'Reset password',
          user: false,
          token: req.params.token
        });
      }
    }
  )
  .post((req, res, next) => {
    if (req.isAuthenticated()) {
      /**
       * User is resetting his or her own password after signing in.
       */
      Users.findById(req.user.id, (err, user) => {
        if (!user) {
          res.redirect('./signout');
        }

        // Note that "placeholder" is a hard-coded value in password fields
        if (req.body.password === req.body.confirmPass &&
            req.body.password !== 'placeholder') {
          user.set('password', req.body.password);
          user.save((err) => {
            if (err) {
              next(createError(500, 'Failed to reset user password'));
            }

            req.login(user, (err) => {
              if (err) {
                next(createError(500, 'Could not authenticate user.'));
              }

              req.flash('message', 'Your password was changed.');
              res.redirect('/');
            });
          });
        } else {
          req.flash('error', 'Passwords do not match.');
          res.redirect('./reset');
        }
      });
    } else if (req.body.token) {
      /**
       * User is fulfilling a password recovery operation.
       */
      Users.findOne({
        resetPassToken: req.body.token,
        resetPassExpires: { $gt: Date.now() }
      }, (err, user) => {
        if (req.body.password === req.body.confirmPass &&
          req.body.password !== 'placeholder') {
          user.set({
            password: req.body.password,
            resetPassToken: undefined,
            resetPassExpires: undefined
          });

          user.save((err) => {
            if (err) {
              next(createError(500, 'Could not reset password.'));
            }

            req.login(user, (err) => {
              if (err) {
                next(createError(500, 'Could not sign in.'));
              }

              req.flash(
                'message',
                'Your password has been reset.'
              );
              res.redirect('/');
            });
          });
        } else {
          req.flash('error', 'Passwords do not match.');
          res.redirect(['./reset/', req.params.token].join(''));
        }
      });
    } else next();
  });

router.route('/recover')
  .get(
    enhanceRes(),
    (req, res) => {
      res.render('auth/recover', {
        title: 'Reset password'
      });
    }
  )
  .post((req, res, next) => {
    Users.findOne({ userName: req.body.username }, (err, user) => {
      const token = crypto.randomBytes(20).toString('hex');

      if (!user) {
        req.flash(
          'error',
          'Sorry, we do not have a matching account on record.'
        );
        res.redirect('./recover');
      }

      user.set({
        resetPassToken: token,
        resetPassExpires: Date.now() + (60 * 60 * 1000) // 1 hour
      });

      user.save((err) => {
        const link = encodeURI([
          `https://${req.headers.host}`,
          `/auth/reset/${token}`,
          `?account=${user.contact.email}`
        ].join(''));

        if (err) {
          next(createError('500', err));
        } else {
          authMessage.send({
            template: 'recoverUser/en',
            message: {
              to: user.contact.email,
            },
            locals: {
              recoverLink: link
            }
          })
            .then(() => {
              req.flash(
                'message',
                'An email has been sent to you with further instructions. You may close this window.'
              );
              res.redirect('/auth/recover');
            })
            .catch((err) => {
              req.flash(
                'message',
                'The mail service is down. Please try again shortly.'
              );
              res.redirect('/auth/recover');
              throw err;
            });
        }
      });
    });
  });

router.route('/disable')
  .get(
    accessControl(),
    enhanceRes(),
    (req, res) => {
      // Users may disable their own account
      Users.findByIdAndUpdate(req.user.id, { active: false }).exec()
        .then(() => {
          req.logout();
          res.locals.userProfile = false;

          res.format({
            html: () => {
              res.render('users/disabled', {
                title: 'Your account has been disabled.'
              });
            },
            json: () => {
              res.json({
                success: true,
                message: 'Your account has been disabled.'
              });
            }
          });
        });
    }
  );

module.exports = router;
