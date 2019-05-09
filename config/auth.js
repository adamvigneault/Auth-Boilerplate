const passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  JwtStrategy = require('passport-jwt').Strategy,
  { ExtractJwt } = require('passport-jwt'),
  GoogleStrategy = require('passport-google-oauth20').Strategy,
  // V2 Azure AD, Office 365
  // MicrosoftStrategy = require('passport-azure-ad-oauth2').Strategy,
  MicrosoftStrategy = require('passport-windowslive').Strategy,
  createError = require('http-errors'),
  oauth = require('./oauth'),
  Users = require('../models/users');

function generateOAUTH2User(token, refreshToken, profile, done) {
  Users.findOne({ oauthID: profile.id }, (err, user) => {
    if (!user) { // No user, create a new user
      Users.create({
        provider: profile.provider,
        oauthID: profile.id,
        active: true,
        name: {
          givenName: profile.name.givenName,
          familyName: profile.name.familyName
        },
        userName: profile.emails[0].value,
        contact: {
          email: profile.emails[0].value
        },
        photos: profile.photos,
        password: String(new Date().getTime())
      }, (err, newUser) => {
        if (err) {
          createError(500, 'Create user failed.');
        }

        done(null, newUser);
      });
    } else {
      // User found, sign in
      done(err, user);
    }
  });
}

function authenticateJwt(payload, done) {
  Users.findOne({ _id: payload.data._id }, (err, user) => {
    if (err) return done(err, false);

    return done(null, user);
  });
}

function authenticateUser(username, pass, done) {
  Users.findOne(
    { userName: username },
    (err, user) => {
      if (err) return done(err, false);

      if (!user) {
        return done(
          null, false,
          {
            message: 'Sorry, there is no account associated with that ' +
            'email address or phone number.'
          }
        );
      }

      if (!user.validPassword(pass)) {
        return done(
          null, false,
          { message: 'Sorry, password is incorrect.' }
        );
      }

      if (!user.active) {
        // ...is a unverified or deactivated user
        return done(
          null, false,
          {
            message: ['Your account is not active. If this is ',
              'your first time signing in, check ',
              'your email for a welcome message from Hewwn, and make sure it ',
              'hasn\'t been marked as spam.'].join('')
          }
        );
      }

      return done(null, user);
    }
  );
}

// Configure Passport Auth
passport.use('local', new LocalStrategy(authenticateUser));

passport.use('jwt', new JwtStrategy(
  {
    secretOrKey: process.env.KEY,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
  },
  authenticateJwt
));

passport.use('google', new GoogleStrategy(
  oauth.google,
  generateOAUTH2User
));

passport.use('microsoft', new MicrosoftStrategy(
  oauth.microsoft,
  generateOAUTH2User
));

// Session serialization
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser((id, done) => {
  Users.findById(id, (err, user) => {
    done(err, user);
  });
});
