var request = require('request');

var db = require('./../app/config');
var Users = require('./../app/collections/users');
var User = require('./../app/models/user');
var Links = require('./../app/collections/links');
var Link = require('./../app/models/link');
var Click = require('./../app/models/click');

var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var sessions = {};

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/

exports.authenticate = function(req, res, next) {
  if (sessions[req.sessionID]) {
    next();
  } else {
    res.redirect('/login');
  }
};

exports.createSession = function(req, callback) {
  var username = req.body.username || req.session.passport.user.username;
  req.session.regenerate(function(err) {
    if (err) {
      console.log(err);
    } else {
      sessions[req.sessionID] = username;
      callback();
    }
  });
};

exports.createUser = function(req, callback) {
  new User({ username: req.body.username }).fetch().then(function(user) {
    if (!user) {
      new User(req.body)
        .save()
        .then(function() { callback(); });
    } else {
      redirect('/signup');
    }
  });
};

exports.checkPassword = function(password, hash, callback) {
  bcrypt.compare(password, hash, function(err, passwordsAreEqual) {
    if (err) console.log(err);
    else callback(passwordsAreEqual);
  });
};

exports.deleteSession = function(req, callback) {
  if (sessions[req.sessionID])
    delete sessions[req.sessionID];
  callback();
};







