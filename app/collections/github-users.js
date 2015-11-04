var db = require('../config');
var GithubUser = require('../models/github-user');

var GithubUsers = new db.Collection();

GithubUsers.model = GithubUser;

module.exports = GithubUsers;