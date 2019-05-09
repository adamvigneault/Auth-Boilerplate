const AclObj = require('acl'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  createError = require('http-errors'),
  { ensureLoggedIn: ensureLogin } = require('connect-ensure-login'),
  init = new Promise((resolve) => {
    mongoose.connection.on('connected', () => {
      const aclService = new AclObj(new AclObj
        .mongodbBackend(mongoose.connection.db, 'acl_', true));

      _createRoles.call(aclService);
      _createRoleParents.call(aclService);

      resolve(aclService);
    });
  })
    .then((aclService) => {
      acl = aclService;
    });

let acl = null;

function middleware(numPathComponents = null, userId, permissions = null) {
  return (req, res, next) => {
    let route = (!req.query.isNew)
      ? '/auth/signin'
      : '/auth/signup';

    route += (req.query.account)
      ? `?account=${req.query.account}` : '';

    res.format({
      html: () => {
        ensureLogin(route)(req, res, () => {
          const user = userId || req.user.id;

          try { // Permission check the resource
            // Ensure roles applied to the authenticated user
            _assignRoles.call(req.user, (assignOp) => {
              assignOp.then(() => acl.middleware(
                numPathComponents,
                user,
                permissions
              )(req, res, next));
            });
          } catch (err) {
            next(createError(err));
            // ACL middleware not connected.
          }
        });
      },
      json: () => {
        // When calling for a JSON response, check to see if the request has
        // already been authenticated.
        if (!req.isAuthenticated()) { // Otherwise, use jwt to do so
          passport.authenticate('jwt', (err, user) => {
            if (user) {
              req.user = user;
              next();
            } else {
              res.json({
                success: false,
                message: 'Invalid token. Please reauthenticate.'
              });
            }
          })(req, res, next);
        } else {
          // Interactive session, pass requests on to the router
          next();
        }
      }
    });
  };
}

function getObj() {
  return acl;
}

async function _assignRoles(done) {
  try {
    const roleStatus = await acl.hasRole(this.id, this.role);
    let userRoles;

    if (!roleStatus) { // Roles do not align with the ACL. Normalize.
      userRoles = await acl.userRoles(this.id)
        .filter(rl => rl.charAt(0) !== '_');

      acl.removeUserRoles(this.id, userRoles, () => {
        done(acl.addUserRoles(this.id, this.role));
      });
    } else {
      done(Promise.resolve({ status: true }));
    }
  } catch (err) {
    done(Promise.reject(err));
  }
}

function _createRoles() {
  this.allow([
    {
      roles: 'user',
      allows: [
        {
          resources: '/users',
          permissions: ['get', 'put']
        },
        {
          resources: ['/service/settings'],
          permissions: ['get', 'post']
        },
        { // Self-disable account
          resources: '/auth/disable',
          permissions: 'get'
        },
        {
          resources: '/service',
          permissions: 'get'
        }
      ]
    },
    {
      roles: 'manager',
      allows: [{
        resources: '/users/search',
        permissions: 'get'
      }]
    },
    {
      roles: 'sys_admin',
      allows: [{
        resources: ['/users', '/users/new', '/units', '/units/new'],
        permissions: ['get', 'put', 'post', 'patch', 'delete']
      }]
    }
  ]);
}

function _createRoleParents() {
  this.addRoleParents('sys_admin', ['manager']);
  this.addRoleParents('manager', ['user']);
}

module.exports = { middleware, init, getObj };
