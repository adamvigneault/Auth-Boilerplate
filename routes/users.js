const express = require('express'),
  { authMessage } = require('../local_modules/mailer'),
  reCapcha = require('../local_modules/reCapcha'),
  { waterfall } = require('async'),
  moment = require('moment-timezone'),
  paginate = require('express-paginate'),
  createError = require('http-errors'),
  { middleware: accessControl } = require('../local_modules/accessControl'),
  enhanceRes = require('../local_modules/enhanceResponse'),
  router = express.Router(),
  Users = require('../models/users');

/* GET users index. */
router.route('/')
  .get( // Get an index of users
    accessControl(),
    enhanceRes(),
    async (req, res, next) => {
      if (req.user.role !== 'sys_admin') {
        return next(createError(
          403,
          'Insufficient permissions to access resource'
        ));
      }

      try {
        const query = {},
          options = {
            skip: req.skip,
            limit: req.query.limit
          };
        let users = [],
          userCount = '',
          pageCount = '';

        req.session.returnTo = req.originalUrl || req.url;

        [users, userCount] = await Promise.all([
          Users.find(query, null, options)
            .exec(),
          Users.count({})
        ]);

        pageCount = Math.ceil(userCount / req.query.limit);

        res.format({
          html: () => {
            res.render('users/index', {
              title: 'Users',
              users,
              pageCount,
              pages: paginate.getArrayPages(req)(5, pageCount, req.query.page)
            });
          },
          json: () => {
            res.json(users);
          }
        });
      } catch (err) {
        next(err);
      }

      return null;
    }
  );

router.route('/search')
  .get(
    accessControl(),
    async (req, res) => {
      if (req.query.term) {
        const query = {
            userName: {
              $regex: req.sanitize(req.query.term),
              $options: 'i'
            }
          },
          options = {
            limit: 10
          },
          users = await Users
            .find(query, null, options)
            .exec();

        res.json(users.map(user => ({
          label: user.displayName,
          value: user._id
        })));
      } else {
        res.json({
          complete: false,
          message: 'No search term'
        });
      }
    }
  );

router.route('/new')
  .get( // View the new user form
    accessControl(),
    enhanceRes(),
    (req, res, next) => {
      res.format({
        html: () => {
          res.render('users/new', {
            title: 'Add user',
            action: 'new',
            user: false,
            account: req.query.account || '',
            roles: Users.roles(),
            timeZones: moment.tz.names()
          });
        },
        json: () => {
          // Placeholder
          next(createError(501, 'Unavailable'));
        }
      });
    }
  )
  .post( // Create a new account (protected by reCapcha)
    reCapcha(),
    (req, res, next) => {
      Users.create(Users.parse(req))
        .then((user) => {
          // If user is created in the app console ('add a user' command),
          // no provider is available.
          if (!user.provider) {
            emailVerify(user);
          } else {
            completeSetup(user);
          }
        })
        .catch((err) => {
          next(createError(500, 'Create user failed.'));
        });

      function emailVerify(user) {
        var link = encodeURI([
          `https://${req.headers.host}`,
          '/auth/verify/',
          user.resetPassToken
        ].join(''));

        authMessage.send({
          template: 'verifyUser/en',
          message: {
            to: user.contact.email
          },
          locals: {
            groupA: user.resetPassToken.slice(0, 4),
            groupB: user.resetPassToken.slice(4),
            verifyLink: link
          }
        }).then(() => {
          req.flash(
            'message',
            `A key has been sent to ${user.userName}`
          );

          res.format({
            html: () => {
              const uri = [
                '/auth/signin',
                `?account=${user.userName}`,
                '&keyPrompt=true'
              ].join('');

              res.redirect(uri);
            },
            json: () => {
              res.json({
                success: true,
                message: `A key has been sent to ${user.userName}`
              });
            }
          });
        }).catch(next);
      }

      function completeSetup(user) {
        // Create a synthetic team to contain orphaned projects
        res.format({
          html: () => {
            res.redirect(req.baseUrl);
          },
          json: () => {
            res.json(user);
          }
        });
      }
    }
  );

router.route('/edit/:id')
  .get( // View edit user form
    accessControl(1),
    enhanceRes(),
    (req, res) => {
      if (req.user.id !== req.params.id && req.user.role !== 'sys_admin') {
        // Access denied: Send the user to his or her own profile
        return res.redirect(`/users/edit/${req.user.id}`);
      }

      // Authorized: pull up the user
      return Users.findById(req.params.id, (err, user) => {
        if (err) {
          req.flash('error', ['A user with that ID could not be found. Would ',
            'you like to create a new one instead?'].join(''));
          res.redirect('./new');
        }

        res.format({
          html: () => {
            res.render('users/new', {
              title: 'Edit user',
              action: req.params.id,
              user,
              account: req.query.account || '',
              roles: Users.roles(),
              timeZones: moment.tz.names()
            });
          },
          json: () => {
            res.json(user);
          }
        });
      });
    }
  );

router.route('/:id')
  .get( // Show a user profile
    accessControl(1),
    enhanceRes(),
    (req, res, next) => {
      waterfall([
        (done) => {
          Users.findById(req.params.id).exec(done);
        }
      ], (err, user) => {
        if (err) {
          next(createError(500, 'User not found.'));
        } else {
          res.format({
            html: () => {
              res.render('users/user', {
                title: user.displayName,
                user,
                isManager: req.user.hasRole('manager')
              });
            },
            json: () => {
              res.json(user);
            }
          });
        }
      });
    }
  )
  .put( // Update a user's attributes
    accessControl(1),
    (req, res) => {
      Users.findByIdAndUpdate(
        req.params.id,
        Users.parse(req),
        { runValidators: true },
        (err, user) => {
          if (err) {
            res.format({
              html: () => {
                req.flash('error', 'Sorry, that username already exists.');
                res.redirect(`${req.baseUrl}/edit/${req.params.id}`);
              },
              json: () => {
                res.json(user);
              }
            });
          } else {
            res.format({
              html: () => {
                req.flash('message', 'User updated.');
                res.redirect(req.baseUrl);
              },
              json: () => {
                res.json(user);
              }
            });
          }
        }
      );
    }
  )
  .delete( // Delete a user
    accessControl(1),
    (req, res, next) => {
      Users.findById(req.params.id, (err, user) => {
        user.remove((err) => {
          if (err) {
            next(createError(500, 'Delete user failed.'));
          } else {
            res.redirect(req.baseUrl);
          }
        });
      });
    }
  );

module.exports = router;
