var mongoose = require('mongoose'),
  validator = require('validator'),
  crypto = require('crypto'),
  { getObj: aclObj } = require('../local_modules/accessControl'),
  moment = require('moment-timezone'),
  roleOptions = [
    {
      val: 'sys_admin',
      label: 'System Admin',
      description: 'Reserved for platform superusers'
    },
    {
      val: 'client_admin',
      label: 'Project Admin',
      description: 'Platform administrators'
    },
    {
      val: 'manager',
      label: 'Manager',
      description: 'Elevated user account for managing shared teams, assets'
    },
    {
      val: 'user',
      label: 'User',
      description: 'Standard user account'
    }
  ],
  userSchema = new mongoose.Schema({
    name: {
      givenName: {
        type: String,
        required: true,
        trim: true
      },
      familyName: {
        type: String,
        trim: true
      }
    },
    schemaVersion: {
      type: Number,
      default: 1
    },
    userName: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },
    provider: String,
    oauthID: String,
    password: {
      type: String,
      set: v => crypto.createHmac('sha256', process.env.KEY)
        .update(v).digest('hex'), // encrypt to store
      required: true
    },
    contact: {
      email: {
        type: String,
        trim: true,
        validate: {
          validator: v => ((v) ? validator.isEmail(v) : true),
          message: '{VALUE} is not a valid email address.'
        },
        lowercase: true
      },
      phone: {
        type: String,
        trim: true,
        validate: {
          validator: v => ((v) ? validator.isMobilePhone(v, 'en-US') : true),
          message: '{VALUE} is not a mobile phone number.'
        }
      }
    },
    photos: [{
      value: String
    }],
    role: {
      type: String,
      enum: roleOptions.map(rle => rle.val),
      required: true,
      default: 'user'
    },
    ip: {
      type: String,
      default: '192.0.0.1'
    },
    date: {
      created: {
        type: Date,
        default: Date.now
      },
      updated: {
        type: Date,
        default: Date.now
      },
      lastAuth: {
        type: Date,
        default: Date.now
      }
    },
    timezone: String,
    active: {
      type: Boolean,
      set: v => Boolean(v),
      default: false
    },
    resetPassToken: String,
    resetPassExpires: Date
  }, {
    timestamps: {
      createdAt: 'date.created',
      updatedAt: 'date.updated'
    }
  }),
  Users;

userSchema
  .virtual('displayName')
  .get(function getDisplayName() {
    return [this.name.givenName, this.name.familyName].join(' ');
  });

userSchema
  .virtual('avatar')
  .get(function getAvatar() {
    return (this.photos[0]) ? this.photos[0].value : null;
  });

userSchema.virtual('url')
  .get(function getUrl() {
    return `/users/${this._id}`;
  });

userSchema.pre('save', function preSave(next) {
  if (this.isNew && !this.provider) {
    this.resetPassToken = crypto.randomBytes(4).toString('hex');
  }
  next();
});

userSchema.statics.parse =
function parse(req) {
  const {
      givenName,
      familyName,
      userName,
      email,
      phone,
      role,
      active,
      timeZone,
      password,
      confirmPass
    } = req.body,
    { sanitize, user } = req,
    userObj = {
      name: {
        givenName: sanitize(givenName),
        familyName: sanitize(familyName),
      },
      userName: req.body[userName],
      contact: {
        email,
        phone
      },
      role,
      active: active !== undefined,
      provider: (user && user.hasRole('manager')) ? 'hewwn' : null,
      ip: req.ip.replace(/^.*:/, ''),
      timezone: moment.tz.zone(timeZone).name || 'America/New_York'
    };

  if (password && password !== 'placeholder') {
    if (password === confirmPass) {
      userObj.password = password;
    } else {
      req.flash('message', 'Password invalid');
    }
  }

  return userObj;
};

userSchema.methods.validPassword =
function validPassword(pwd) {
  return (crypto.createHmac('sha256', process.env.KEY)
    .update(pwd).digest('hex') === this.password);
};

userSchema.methods.hasRole =
async function hasRole(role) {
  try {
    const roleStatus = await aclObj().hasRole(this.id, role);
    return (roleStatus || this.role === 'sys_admin');
  } catch (err) {
    return err;
    // Throw an error checking ACL
  }
};

userSchema.statics.roles =
function roles() {
  return roleOptions;
};

userSchema.index({ 'name.givenName': 1, 'name.familyName': 1 });

Users = mongoose.model('User', userSchema);

module.exports = Users;
