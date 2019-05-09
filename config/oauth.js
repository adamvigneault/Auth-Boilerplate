const oauth = {
  google: {
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    scope: ['profile', 'email']
  },
  microsoft: {
    clientID: process.env.MICROSOFT_ID,
    clientSecret: process.env.MICROSOFT_SECRET,
    scope: ['wl.signin', 'wl.basic', 'wl.emails', 'wl.phone_numbers']
  }
};

module.exports = oauth;
