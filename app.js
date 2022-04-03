require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

app.use(session({
    secret: "Our little secret can't be here how can think of that man eyah .",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());

app.use(passport.session());


mongoose.connect('mongodb://localhost:27017/userDB')


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId : String,
    secret: String
})


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);


passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id); 
 // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
      done(err, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLINET_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {

  User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get('/', (req, res) => {
    res.render('home');
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets', passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/register', (req, res) => {
    res.render('register');
})

app.get('/secrets', (req, res) => {
    // if(req.isAuthenticated()){
    //     res.render('secrets');
        
    // } else {
    //     res.redirect('/login');
    // }

    User.find({secret: {$ne: null}}, (err, foundUsers) => {
      if(err){
        console.log(err);
      } else if(foundUsers){
        res.render('secrets', {usersWithSecrets: foundUsers});
      }
    })
})

app.post('/register', (req, res) => {

    const userName = req.body.email_address;
    const password = req.body.password;

    User.find({email: userName}, function(err, foundUsers){
        if(foundUsers.length === 0){
            User.register({username: userName}, password, (err, user) => {
                if(err){
                    console.log(err);
                    res.redirect('/register');
                } else {
                    req.login(user, (err) => {
                        if(!err){
                        passport.authenticate("local");
                        req.session.save((err) => {
                          if(!err){
                            res.redirect('/secrets');
                          }
                        });

                }
                    })
                }
            })
        }
    })
  
    // User.register({username: req.body.email_address}, req.body.password, function(err, user){
    //     if(err){
    //         console.log(err);
    //         console.log("hello");
    //         res.redirect('/register');
    //     } else {
    //         if(user){
    //             passport.authenticate("local")(req, res, function(){
    //                 res.redirect('/secrets');
    //                 console.log("dont");
    //             })
    //         }
    //     }
    // })


    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

    //     const newUser = new User({
    //         email : req.body.email_address,
    //         password : hash
    //     })
    
    //     newUser.save((err) => {
    //         if(err){
    //             console.log(err);
    //         } else {
    //             res.render('secrets');
    //         }
    //     })

    // });


})


app.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/')
})

app.post('/login', (req, res) => {


    const email = req.body.email_address;
    User.findOne({ username: email }, function (err, u) {
      if (err) {
        console.log(err);
      } else {
        if (u) {
          u.authenticate(req.body.password, (err, model, info) => {
            if (info) {
                res.redirect('/login');
            }
            if (err) {
              console.log(err);
            } else if (model) {
              req.login(u, (err) => {
                if (err) {
                  console.log(err);
                  
                } else {
                  passport.authenticate("local");
                  req.session.save((error) => {
                    if (err) {
                      console.log(err);
                    } else {
                      res.redirect("/secrets");
                    }
                  });
                }
              });
            }
          });
        } else {
          res.redirect('/login')
        }
      }
    });














    // const userName = req.body.email_address;
    // const password = req.body.password;

    // User.findOne({email : userName}, (err, foundUser) => {
    //     if(err){
    //         console.log(err);
    //     } else {
    //         if(foundUser){  
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                if(result === true){
    //                 res.render('secrets');
    //                }
    //             });
               
    //         }
    //     }
    // })
})



app.get('/submit', (req, res) => {
  if(req.isAuthenticated()){
    res.render('submit');
    console.log("has");
} else {
    res.redirect('/login');
}
})

app.post('/submit', (req, res) => {
  const sumbittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id, (err, foundUsers) =>{
    if(err){
      console.log(err);
    } else if(foundUsers){
      foundUsers.secret = sumbittedSecret;
      foundUsers.save(()=> {
        res.redirect('/secrets');
      })
    }
  })
})

app.listen(3000, () => {
    console.log("Server Is Running On Port 3000");
})

