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
// var resetUrl = 'https://api.vingtv.com#/resetpassword';
// var BASE_URL = 'https://api.vingtv.com';
// if ('dev' === env) {
var resetUrl = 'http://localhost:3000#/resetpassword';
var BASE_URL = 'http://localhost:3000';
// }



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
  var createReturnObj = function(member, token) {
    // console.log('member========++>',member);
    // delete member.password;
    // console.log('================================');
    // console.log('member', member.member);
    return member;
    return {
      id: member.id,
      // userId: member.id,
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



  var createMemberToken = function(member, done) {
    member.createAccessToken({
      tt: APP_ACCESS_TOKEN_TTL
    }, function(err, token) {
      if (err) {
        return done({
          message: err
        });
      }
      // console.log('member===>', member.id);
      User.findById(member.id, function(err, memberWithImage) {
        if (err) {
          console.log(err);
          return done(err);
        }
        // console.log('memberWithImage', memberWithImage);
        var returnObj = createReturnObj(memberWithImage, token);
        return done(err, returnObj);
      })

    });
  };

  var download = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
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
      from: '"saranros" <info@playwork.co.th>', // sender address
      to: info.email, // list of receivers
      subject: 'Reset Password saranros App', // Subject line
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
      // console.log(mailOptions);
      // send mail with defined transport object
      transport.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log('reject here');
          console.log("err======>", error);
          return console.log(error);
        }
        console.log(info);
        console.log('Message sent: ' + info);
        // return cb(null, info);
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
  User.beforeRemote('create', function(ctx, model, next) {
    console.log('beforeRemote', ctx.req.body);
    User.findOne({
      where: {
        mobile: ctx.req.body
      }
    }, function(err, user) {
      if (err) {
        console.log(err);
        var errMsg = new Error(err);
        errMsg.status = 422; // HTTP status code
        next(errMsg);
      }
      if (user) {
        var errMsg = new Error(err);
        errMsg.status = 422
        next(errMsg);
      }
      next();
    })
  })
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
      // model.id = undefined;
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
    // var Profile = User.app.models.Profile;
    // Set FB access token to FB connector
    FB.setAccessToken(accessToken);
    FB.extend({
      appId: '2045032589152392',
      appSecret: '0238147b8c1c5cc34540c3f7462815a8'
    });

    // Check if FB is valid
    FB.api('me?fields=id,name,email,picture', function(res) {
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
        }, function(err, member) {
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
              member.save(function(err) {
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
            }, function(err, member2) {
              if (err) {
                console.log(err);
              }
              if (member2 && member2.email === email) {
                member2.facebookId = facebookId;
                member2.picture = res.picture;
                member2.facebookstatus = true;
                member2.save(function(err) {
                  if (err) {
                    return done(err);
                  }
                  // Generate App Access Token for logged in member
                  return createMemberToken(member2, done);
                });
              } else {

                var newMember = {};
                newMember.facebookId = res.id;
                // newMember.displayName = res.name;
                newMember.email = res.email ? res.email : res.id + 'saranros@facebook.com';
                newMember.picture = res.picture;
                newMember.userType = 'user';
                // var newProfile = {};
                // newProfile.nickName = res.name;
                // newProfile.name = res.name;
                // Generate salt
                bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
                  if (err) {
                    callback(err);
                  }

                  // Generate password
                  var d = Date.now;
                  bcrypt.hash(newMember.email + d.toString(), salt, function(err, hash) {
                    if (err) {
                      callback(err);
                    }
                    newMember.password = hash;

                    // Create a new member
                    User.create(newMember, function(err, user) {
                      if (err) {
                        callback(err);
                      }
                      // newProfile.create_by = user.id
                      Profile.create(newProfile, function(err, profile) {
                        if (err) {
                          callback(err);
                        }
                        user.profileId = profile.id;
                        user.save();

                        console.log("New user with facebook", user);
                        var imageFilename = Math.floor(Math.random() * 1000) + '-' + Date.now() + '.jpg';
                        var imagePath = path.join(__dirname, '../../client/dist/assets/profile/' + imageFilename);
                        download(res.picture.data.url, imagePath, function() {
                          console.log('done downloading');
                          // Image.create({
                          //     profileId: user.id,
                          //     url: '/assets/profile/' + imageFilename,
                          //     hidden: 0
                          //   })
                          // create access token
                          return createMemberToken(user, done);
                        });
                      })
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

  User.newPassword = function(data, callback) {

    // console.log(data.accessToken);
    if (!data.accessToken) {
      var errMsg = new Error('Not Authorized.');
      errMsg.status = 401; // HTTP status code
      return callback(errMsg);
    }

    User.findById(data.accessToken.userId, function(err, member) {
      // Member.find({
      //   where: {
      //     email: data.email
      //   }
      // }, function(err, member) {
      if (err) {
        console.log(err);
        var errMsg = new Error(err);
        errMsg.status = 422; // HTTP status code
        return callback(errMsg);
      }
      if (member) {
        bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
          if (err) {
            console.log(err);
            var errMsg = new Error(err);
            errMsg.status = 422; // HTTP status code
            return callback(errMsg);
          }

          bcrypt.hash(data.password, salt, function(err, hash) {
            if (err) {
              console.log(err);
              var errMsg = new Error(err);
              errMsg.status = 422; // HTTP status code
              return callback(errMsg);
            }
            User.updateAll({
              id: member.id
            }, {
              password: hash
            }, function(err, info) {
              if (err) {
                console.log(err);
                var errMsg = new Error(err);
                errMsg.status = 422; // HTTP status code
                return callback(errMsg);
              }
              return callback(null, member);
            });
          });
        });
      } else {
        // console.log('Cannot find Member');
        var errMsg = new Error('Cannot find Member');
        errMsg.status = 422; // HTTP status code
        return callback(errMsg);
      }
    });
  };
  User.remoteMethod('newPassword', {
    http: {
      path: '/resetPassword',
      verb: 'post'
    },
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      }
    }],
    returns: {
      type: 'object',
      root: true
    }
  });

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
          arg: 'token',
          type: 'Object',
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

  User.changePassword = function(data, req, cb) {
    var userId = req.accessToken.userId
    if ((data.oldPassword === null || data.oldPassword === undefined) || (
        data.newPassword === null || data.newPassword === undefined)) {
      var error = new Error('Validate.');
      error.status = 422;
      return cb(error);
    }

    User.findById(userId, {
      where: {
        status: 'active',
      }
    }, function(err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        var errMsg = new Error('Can not found member !!');
        errMsg.status = 403;
        return cb(errMsg);
      }
      user.hasPassword(data.oldPassword, function(err, response) {
        if (response === false) {
          var errMsg = new Error('รหัสผ่านเก่าของคุณไม่ถูกต้อง');
          errMsg.status = 403;
          return cb(errMsg);
        }
        user.password = data.newPassword;
        user.save();
        return cb(null, {
          success: true
        });
      });
    });
  };

  User.remoteMethod('changePassword', {
    description: 'Change password',
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      }
    }, {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req'
      }
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      verb: 'post'
    }
  });

  User.requestOTP = function(mobile, cb) {
    var OTP = User.app.models.OTP;
    OTP.updateAll({
      mobile: mobile
    }, {
      status: 'expire'
    })
    User.findOne({
      where: {
        mobile: mobile
      }
    }, function(err, member) {
      if (err) {
        console.log(err);
        var errMsg = new Error(err);
        errMsg.status = 422; // HTTP status code
        return cb(errMsg);
      }
      if (member) {
        OTP.create({
          otp_code: Math.floor(Math.random() * 10001),
          mobile: mobile,
          status: "active",
          userId: member.id
        }, function(err, otp) {
          if (err) {
            console.log(err);
            var errMsg = new Error(err);
            errMsg.status = 422; // HTTP status code
            return cb(errMsg);
          }
          //send otp
          // otpObj = {
          //   otp_code: otp.otp_code,
          //   mobile: otp.mobile,
          // }
          return cb(null, otp);
        })
      }
    })
  };

  User.remoteMethod('requestOTP', {
    description: 'Request send otp',
    accepts: [{
      arg: 'mobile',
      type: 'string',
      required: true,
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      verb: 'post'
    }
  });

  User.verifyOTP = function(otp, mobile, cb) {
    var OTP = User.app.models.OTP;
    OTP.findOne({
      where: {
        mobile: mobile,
        otp_code: otp
      }
    }, function(err, historyOTP) {
      if (err) {
        console.log(err);
        var errMsg = new Error(err);
        errMsg.status = 422; // HTTP status code
        return cb(errMsg);
      }
      if (historyOTP) {
        var expireTime = moment(historyOTP.create_at).add(5, 'minutes');
        // check otp expire
        if (historyOTP.status === "active" && moment() <= expireTime) {
          User.findById(historyOTP.userId, {
            include: 'profile'
          }, function(err, user) {
            if (err) {
              console.log(err);
              var errMsg = new Error(err);
              errMsg.status = 422; // HTTP status code
              return cb(err);
            }
            return cb(null, user)
          })
        } else {
          historyOTP.status = "expire";
          historyOTP.save();
          return cb(null, "expire");
        }
      } else {
        var errMsg = new Error(err);
        errMsg.status = 422; // HTTP status code
        return cb(err);
      }
    })
  };

  User.remoteMethod('verifyOTP', {
    description: 'Request send otp',
    accepts: [{
      arg: 'otp',
      type: 'number',
      required: true,
    }, {
      arg: 'mobile',
      type: 'string',
      required: true,
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      verb: 'post'
    }
  });
  User.setup();
};
//
