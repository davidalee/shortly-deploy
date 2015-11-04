var db = require('../config');

var GithubUser = db.Model.extend({
  tableName: "github-users"
});

module.exports = GithubUser;