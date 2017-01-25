var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
var Schema = mongoose.Schema;

var EmailTemplate = require('email-templates').EmailTemplate
var path = require('path')

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  unsubscribed: { type: Boolean, default: false },

  facebook: String,
  twitter: String,
  google: String,
  github: String,
  instagram: String,
  linkedin: String,
  steam: String,
  tokens: Array,
  applications: [{type : Schema.ObjectId, ref : 'App'}],

  profile: {
    name: { type: String, default: '' },
    gender: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    picture: { type: String, default: '' }
  }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return next(err);
    }
    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    cb(err, isMatch);
  });
};

userSchema.methods.notify = function(reviews, app) {
  console.log("notify user " + this.email + " about " + reviews);

  var self = this;

  var templateDir;

  if (app.store == 'AppStore') {  
    templateDir = path.join(__dirname, '../templates', 'appstore_review_email')
  } else {
    templateDir = path.join(__dirname, '../templates', 'google_play_review_email')
  }

  console.log("template dir " + templateDir);

  var newsletter = new EmailTemplate(templateDir)
  var title = app.name + ' has ' + reviews.length;
  
  if (reviews.length==1) { 
    title = title + ' review!'
  } else {
    title = title + ' reviews!'
  }

  var baseURL = 'http://toolsfordevs.com';
  var unsubscribeURL = baseURL + '/account/unsubscribe/' + self._id;
  newsletter.render({title:title, app:app, reviews:reviews, serverURL: baseURL, unsubscribeURL: unsubscribeURL}, function (err, result) {
  // console.log("rendered " + result.html);
  // result.html 

    var transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });

    var title = app.name + " has " + reviews.length + " new review.";
    if (reviews.length>1) {
      title = app.name + " has " + reviews.length + " new reviews.";
    }

    var mailOptions = {
      to: self.email,
      from: '"ToolsForDevs" <noreply@toolsfordevs.com>',
      subject: title,
      html: result.html
    };
    transporter.sendMail(mailOptions, function(err) {
      if (err) {
        console.log("cannot send email to user because " + err);  
      } else {
        console.log("successfully notified " + self.email + " about new reviews");  
      }
    });
  })
};

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return 'https://gravatar.com/avatar/?s=' + size + '&d=retro';
  }
  var md5 = crypto.createHash('md5').update(this.email).digest('hex');
  return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + '&d=retro';
};

var User = mongoose.model('User', userSchema);

module.exports = User;