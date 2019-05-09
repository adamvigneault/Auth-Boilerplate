const express = require('express'),
  helmet = require('helmet'),
  mongoose = require('mongoose'),
  passport = require('passport'),
  path = require('path'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  session = require('express-session'),
  sanitizer = require('express-sanitizer'),
  paginate = require('express-paginate'),
  methodOverride = require('method-override'),
  logger = require('morgan'),
  flash = require('connect-flash'),
  MongoStore = require('connect-mongo')(session),
  cors = require('cors'),
  dotenv = require('dotenv').config(), // eslint-disable-line
  auth = require('./config/auth'), // eslint-disable-line

  indexRouter = require('./routes/index'),
  authRouter = require('./routes/auth'),
  usersRouter = require('./routes/users'),
  serviceRouter = require('./routes/service'),

  app = express();

// Catch routing errors
function catchRouteError(req, res) {
  res.status(404).format({
    html: () => {
      res.render('errors/404');
    },
    json: () => {
      res.json({
        status: 'error',
        message: 'File not found'
      });
    }
  });

  res.status(403).format({
    html: () => {
      res.render('errors/403');
    },
    json: () => {
      res.json({
        status: 'not authorized',
        message: 'You are not authorized to access this resource'
      });
    }
  });
}

// Catch system errors
function catchSystemError(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
}

// view engine setup
app.set('views', path.join(__dirname, 'src/ejs'));
app.set('view engine', 'ejs');

// Register middleware
app
  .use(helmet({ // Disabled filters are handled by NGINX proxy
    xssFilter: false,
    noSniff: false,
    frameguard: false
  }))
  .use(logger((process.env.NODE_ENV === 'development')
    ? 'dev'
    : 'tiny'))
  .use(cors())
  .use(express.json())
  .use(express.static(path.join(__dirname, 'dist')))
  .use(cookieParser())
  .use(bodyParser.urlencoded({ limit: '500kb', extended: true }))
  .use(sanitizer())
  // Middleware for re-routing to HTTPS
  // .use(secureReroute)
  .use(methodOverride('_method'))
  .use(session({
    secret: process.env.KEY,
    cookie: {
      maxAge: Number(process.env.SESSION_LENGTH) // thirty minute timeout
    },
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true
  }))
  .use(passport.initialize())
  .use(passport.session())
  .use(flash());

app.use(paginate.middleware(25, 50));

// Assign top-level routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/service', serviceRouter);

// catch 403 and 404, forward to error handler
app.use(catchRouteError);

// error handler
app.use(catchSystemError);

module.exports = app;
