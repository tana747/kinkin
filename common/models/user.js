'use strict';

var FB = require('fb');
var bcrypt = require('bcryptjs');
var nodemailer = require('nodemailer');
var request = require('request');
var path = require('path');
var fs = require('fs');
var moment = require('moment');

// var transport = nodemailer.createTransport('smtps://monthira%40playwork.co.th:2482536sa@smtp.gmail.com');
// create reusable transporter object using the default SMTP transport
var transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vingmailer@playwork.co.th',
    pass: 'Maewnam7476'
  }
});

var loopback = require('loopback');

var SALT_FACTOR = 10;
// Development Environment for reset password
var env = process.env.NODE_ENV || 'production';
var resetUrl = 'https://api.vingtv.com#/resetpassword';
var BASE_URL = 'https://api.vingtv.com';
if ('dev' === env) {
  resetUrl = 'http://localhost:3000#/resetpassword';
  BASE_URL = 'http://localhost:3000';
}


/*!
 * Module Constants.
 */
var APP_ACCESS_TOKEN_TTL = 1209600;


module.exports = function(User) {


  /// Helper function to validate token
  function validateToken(req, data, callback) {
    var AccessToken = User.app.models.AccessToken;
    var accessToken = req.query.access_token;

    if (!accessToken || accessToken === '') {
      accessToken = data.access_token;
      if (!accessToken || accessToken === '') {
        return callback('no token');
      }
    }
    AccessToken.findOne({
      where: {
        id: accessToken
      }
    }, function(err, token) {
      if (err) {
        return callback(err);
      }
      if (token) {
        if (token.userId.toString() === data.userId) {
          return callback();
        } else {
          return callback('Not Authorized');
        }
      } else {
        return callback('Token Invalid');
      }
    });
  }

  // inline helper function
    var createReturnObj = function (member, token) {
      return {
        id: member.id,
        userId: member.id,
        name: member.name,
        email: member.email,
        displayName: member.displayName,
        picture: member.picture,
        notificationFollow: member.notificationFollow,
        facebookId: member.facebookId,
        token: token,
        facebookstatus: true
      };
    };



  var createMemberToken = function (member, done) {
    member.createAccessToken({
      tt: APP_ACCESS_TOKEN_TTL
    }, function (err, token) {
      if (err) {
        return done({
          message: err
        });
      }
      User.findById(member.id, {
        include: [{
          relation: 'profile',
          scope: {
            where: {
              hidden: 0
            },
          }
        }]
      }, function (err, memberWithImage) {
        if (err) {
          console.log(err);
          return done(err);
        }
        console.log(memberWithImage);
        var returnObj = createReturnObj(memberWithImage, token);
        return done(err, returnObj);
      })

    });
  };

  var download = function (uri, filename, callback) {
     request.head(uri, function (err, res, body) {
       console.log('content-type:', res.headers['content-type']);
       console.log('content-length:', res.headers['content-length']);

       request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
     });
   };

  User.beforeRemote('**', function(ctx, unused, next) {
    console.log('Member.beforeRemote');
    console.log(ctx.methodString);

    if (ctx.req.accessToken) {
      ctx.req.body.accessToken = ctx.req.accessToken;
      return next();
    } else {
      return next();
    }
  });


  /**
   *  Reset password handle
   */
  User.on('resetPasswordRequest', function(info) {

    var mailOptions = {
      from: '"kinkin" <info@playwork.co.th>', // sender address
      to: info.email, // list of receivers
      subject: 'Reset Password kinkin App', // Subject line
      text: 'Please reset password at: ' + resetUrl + '?user=' + info.user.id + '&access_token=' + info.accessToken.id, // plaintext body
      html: 'Please reset password at:<br> <a href="' + resetUrl + '?user=' + info.user.id + '&access_token=' + info.accessToken.id + '">Reset Password</a>',
    };

    console.log(mailOptions.html);
    // requires AccessToken.belongsTo(User)
    info.accessToken.user(function(err) {
      if (err) {
        console.log(err);
        return;
      }
      console.log(mailOptions);
      // send mail with defined transport object
      transport.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log('reject here');
          console.log("err======>", error);
          return console.log(error);
        }
        console.log(info);
        console.log('Message sent: ' + info);
      });
    });
  });



    /**
     *  Return token after signup
     */
    User.observe('after save', function(ctx, next) {
      if (ctx.isNewInstance) {
        // // console.log('Saved %s#%s', ctx.Model.modelName, ctx.instance.id);
        // ctx.instance
        ctx.instance.createAccessToken({
          tt: APP_ACCESS_TOKEN_TTL
        }, function(err, token) {
          if (err) {
            console.log(err);
            next();
          }
          ctx.instance.token = token;
          next();
        });
      } else {
        // // console.log('Updated %s matching %j',
        //     ctx.Model.pluralModelName,
        //     ctx.where);
        next();
      }

    });

    /**
     *  Change how login return token
     */
    User.afterRemote('login', function(ctx, model, next) {

      User.findById(model.userId, function(err, member) {
        if (err) {
          console.log(err);
        }

        var token = {
          id: model.id,
          ttl: model.ttl,
          created: model.created,
          userId: model.userId,
        };

        for (var key in member) {
          if (typeof member[key] !== 'function' && typeof member[key] !== 'object' && member[key] && key !== 'password' && typeof member[key] !== 'boolean') {
            model[key] = member[key];
          }
        }
        model.token = token;
        model.id = undefined;
        delete model.id;
        model.id = model.userId;

        model.userId = undefined;
        delete model.userId;

        model.ttl = undefined;
        delete model.ttl;
        model.created = undefined;
        delete model.created;

        next();
      });
    });


    User.loginWithFacebookAccessToken = function(accessToken, done) {

      // Set FB access token to FB connector
      FB.setAccessToken(accessToken);
      FB.extend({appId: '2045032589152392', appSecret: '0238147b8c1c5cc34540c3f7462815a8'});

        // Check if FB is valid
        FB.api('me?fields=id,name,email,picture', function (res) {
          if (res.error) {
            console.log(res)
            var err = new Error('Invalid FacebookAccessToken.');
            err.status = 422; // HTTP status code
            done(err);
          } else {
            console.log(res);

            // res.id is facebookId in our member
            var facebookId = res.id;
            var email = res.email;
            var picture = res.picture;

            User.findOne({
              where: {
                facebookId: facebookId
              }
            }, function (err, member) {
              if (err) {
                console.log(err);
                return done({
                  message: err
                });
              }

              if (member) {
                if (!member.facebookstatus) {
                  member.facebookstatus = true;
                  member.picture = res.picture;
                  member.save(function (err) {
                    if (err) {
                      return done(err);
                    }
                  });
                }
                // Generate App Access Token for logged in member
                return createMemberToken(member, done);
              } else {
                User.findOne({
                  where: {
                    email: email
                  }
                }, function (err, member2) {
                  if (err) {
                    console.log(err);
                  }
                  if (member2 && member2.email === email) {
                    member2.facebookId = facebookId;
                    member2.picture = res.picture;
                    member2.facebookstatus = true;
                    member2.save(function (err) {
                      if (err) {
                        return done(err);
                      }
                      // Generate App Access Token for logged in member
                      return createMemberToken(member2, done);
                    });
                  } else {

                    var newMember = {};
                    newMember.facebookId = res.id;
                    newMember.displayName = res.name;
                    newMember.email = res.email ? res.email : res.id + 'ving@facebook.com';
                    newMember.picture = res.picture;

                    // Generate salt
                    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
                      if (err) {
                        callback(err);
                      }

                      // Generate password
                      var d = Date.now;
                      bcrypt.hash(newMember.email + d.toString(), salt, function (err, hash) {
                        if (err) {
                          callback(err);
                        }
                        newMember.password = hash;

                        // Create a new member
                        User.create(newMember, function (err, user) {
                          if (err) {
                            callback(err);
                          }

                          var imageFilename = Math.floor(Math.random() * 1000) + '-' + Date.now() + '.jpg';
                          var imagePath = path.join(__dirname, '../../client/dist/assets/profile/' + imageFilename);
                          download(res.picture.data.url, imagePath, function () {
                            console.log('done downloading');
                            // Image.create({
                            //     profileId: user.id,
                            //     url: '/assets/profile/' + imageFilename,
                            //     hidden: 0
                            //   })
                              // create access token
                            return createMemberToken(user, done);
                          });


                        });
                      });
                    });
                  }
                });
              }
            });
          } // else
        }); // FB.api('/me')
      };


  User.setup = function() {
    User.remoteMethod(
      'loginWithFacebookAccessToken', {
        description: 'Login a user with Facebook Access Token.',
        accepts: {
          arg: 'accessToken',
          type: 'string',
          required: true,
          description: 'Facebook access token acquired by client.'
        },
        returns: {
         arg: 'token', type: 'Object',
         description: 'App access token.'
        },
        returns: {
          type: 'object',
          root: true
        },
        http: {
          verb: 'post'
        }
      });
  }

  User.setup();

};
