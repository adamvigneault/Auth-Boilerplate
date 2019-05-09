===== Requirements =====

Docker.

===== Install and run =====
1. Clone the repo
2. Create a .env file at the root of the project modeled after '.env.default.' Fill out the requried environment variables, including key/secrets for ReCaptcha, the Google API and Microsoft API (if you intend to use it for the purposes of this test), and an admin email address. This latter variable is EXTREMELY IMPORTANT, as it will be your bootstrap into the sys_admin role.
3. Create a local volume for the database to reside in: "docker volume create authDB"
4. Start the application at https://localhost by running: "docker-compose up". Wait for server to download and initialize.
5. Navigate to the running app, and click "Sign up." Create a new user with an email address that matches the one you originally configured in the .ENV file. This should automatically authenticate.

**NOTE: Make sure to assign an authorized origin to your Google/Microsoft/ReCaptcha API keys: https:localhost

**NOTE: I've included a self-signed SSL cert in the /keys directory

===== Database =====

Mongo (containerized).

The User collection has the following schema:
{
  name: {
    givenName: String,
    familyName: String
  }
  schemaVersion: Number,
  userName: String,
  provider: String,
  oauthID: String,
  password: String, (crypto'd),
  contact: {
    email: String,
    phone: String
  },
  photos: [String],
  role: String, (enumerated)
  ip: String,
  date: {
    created: Date,
    updated: Date,
    lastAuth: Date
  },
  timezone: String,
  active: Bool,
  resetPassToken: String,
  resetPassExpires: Date
}

...and can be found at /models/users.js

===== Tooling =====

This project is a de-tuned version of my own home-rolled authentication boilerplate. It uses Passport for federated authentication, ReCaptcha, acl for access control, has a integrated emailer (and templating support), etc. The UI has been mostly removed for the purposes of this demonstration, but a more complete implementation can be found at https://app.hewwn.com.
