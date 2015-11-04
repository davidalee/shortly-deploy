var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var GithubUser = require('./app/models/github-user');
var GithubUsers = require('./app/collections/github-users');

var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(session({
  secret: "LordVoldemort",
  resave: false,
  saveUninitialized: false
}));

var GITHUB_CLIENT_ID = '73ba57189bac8e992587';
var GITHUB_CLIENT_SECRET = 'd1918d510670d52887eed4bfc3bc8984c0fa0d4a';

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GithubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "https://frozen-ocean-9394.herokuapp.com/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
    // new GithubUser({ githubId: profile.id }).fetch().then(function(user) {
    //   if (user) {
    //     return done(null, user);
    //   }
    //   else {
    //     new GithubUser({ githubId: profile.id }).save().then(function(user) {
    //       return done(null, user);
    //     });
    //   }
    // });
  }
));


app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    util.createSession(req, function() {
      res.redirect('/');
    });
  }
);

app.get('/', util.authenticate,
function(req, res) {
  res.render('index');
});

app.get('/create', util.authenticate,
function(req, res) {
  res.render('index');
});

app.get('/links', util.authenticate,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.post('/signup',
function(req, res) {
  util.createUser(req, function() {
    util.createSession(req, function() {
      res.redirect('/');
    });
  });
});

app.post('/login', function(req, res) {
  new User({ username: req.body.username }).fetch().then(function(user) {
    if (!user) {
      res.redirect('/login');
    } else {
      util.checkPassword(req.body.password, user.get('password'), function(passwordsAreEqual) {
        if (passwordsAreEqual) {
          util.createSession(req, function() {
            res.redirect('/');
          });
        } else {
          res.redirect('/login');
        }
      });
    }
  });
});

app.get('/logout', function(req, res) {
  util.deleteSession(req, function() {
    res.redirect('/login');
  });
});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on', process.env.PORT || 4568);
app.listen(process.env.PORT || 4568);
