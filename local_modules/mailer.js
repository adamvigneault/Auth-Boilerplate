const nodemailer = require('nodemailer'),
  path = require('path'),
  Email = require('email-templates'),
  transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    secure: true,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  }),

  authMessage = new Email({
    message: {
      from: process.env.MAIL_USER
    },
    views: {
      root: path.join(__dirname, '../src/ejs/email'),
      options: {
        extension: 'ejs'
      }
    },
    /*
    send: true,
    preview: false,
    */
    transport
  });

module.exports = { transport, authMessage };
