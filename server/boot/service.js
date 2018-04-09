const exec = require('child_process').exec;
const Fs = require('fs');
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
    var obj;
    var db;
    Fs.readFile(__dirname + '/../datasources.json', 'utf8', function(err, data) {
      if (err) throw err;
      obj = JSON.parse(data);
      db = obj.mongoDb.database;
      let provinceCollection = `mongoimport --db ${db} --collection Province < ./addressInformation/province.json`
      let districtCollection = `mongoimport --db ${db} --collection District < ./addressInformation/district.json`
      let amphurCollection = `mongoimport --db ${db} --collection Amphur < ./addressInformation/amphur.json`
      if (province.length === 0) {
        exec(provinceCollection, (error, stdout, stderr) => {
          if (error !== null) {
            console.log(`exec error: ${error}`);
          }
          exec(districtCollection, (error, stdout, stderr) => {
            if (error !== null) {
              console.log(`exec error: ${error}`);
            }
            exec(amphurCollection, (error, stdout, stderr) => {
              if (error !== null) {
                console.log(`exec error: ${error}`);
              }
              console.log('amphurCollection Success',`${stdout}`);
              console.log('amphurCollection Err',`${stderr}`);
            });
            console.log('districtCollection Success',`${stdout}`);
            console.log('districtCollection Err',`${stderr}`);
          });
          console.log('provinceCollection Success',`${stdout}`);
          console.log('provinceCollection Err',`${stderr}`);
        });
      };
    });
  });
};
