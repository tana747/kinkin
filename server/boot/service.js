const exec = require('child_process').exec;
module.exports = function(app) {
  var User = app.models.user;
  var Role = app.models.Role;
  var RoleMapping = app.models.RoleMapping;
  var Province = app.models.Province;
  User.findOne({
    where: {
      username: 'admin'
    }
  }, function(err, user) {

    if (!user) {
      User.create({
        username: 'admin',
        displayName: 'admin',
        email: 'admin@saranros.kin',
        password: 'saranrospassword',
        type: 'admin'
      }, function(err, user) {
        if (err) throw err;

        console.log('Created users:', user);

        //create the admin role
        Role.findOne({
          where: {
            name: 'admin'
          }
        }, function(err, role) {
          if (err) throw err;

          if (!role) {
            //create the admin role
            Role.create({
              name: 'admin'
            }, function(err, role) {
              if (err) throw err;

              console.log('Created role:', role);

              role.principals.create({
                principalType: RoleMapping.USER,
                principalId: user.id
              }, function(err, principal) {
                if (err) throw err;
                console.log('Created principal:', principal);
              });
            });
          } else {
            role.principals.create({
              principalType: RoleMapping.USER,
              principalId: user.id
            }, function(err, principal) {
              if (err) throw err;
              console.log('Created principal:', principal);
            });
          }
        });
      });
    } else {
      console.log('Admin already exist');
    }
  });

  Province.find({}, function(err, province) {
    // console.log(province.length);
    if (province.length === 0) {
       exec('sh addressInformation/import.sh', (error, stdout, stderr) => {
          if (error !== null) {
            console.log(`exec error: ${error}`);
          }
          // console.log(`${stdout}`);
          // console.log(`${stderr}`);
        });
    }
  });
};
