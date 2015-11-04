var db = require('../config');
var Promise = require('bluebird');
var bcrypt = require('bcrypt-nodejs');
var hash = Promise.promisify(bcrypt.hash);

var User = db.Model.extend({
  tableName: "users",
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model) {
      return hash(model.get('password'), null, null)
        .then(function(hash) {
          model.set('password', hash);
        });
    });
  }
});

module.exports = User;