const request = require('request'),
  qs = require('querystring');

function reCapcha() {
  return (req, res, next) => {
    // Check reCapcha
    request.post(
      ['https://www.google.com/recaptcha/api/siteverify', '?',
        qs.stringify({
          secret: process.env.RECAPTCHA_SECRET,
          response: req.body['g-recaptcha-response'],
          remoteip: (req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress).replace(/^.*:/, '')
        })].join(''),
      (err, captcha, body) => {
        if (!JSON.parse(body).success) {
          next(err);
        } else {
          next();
        }
      }
    );
  };
}

module.exports = reCapcha;
