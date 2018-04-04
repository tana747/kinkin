'use strict';

module.exports = function(Tag) {
  Tag.createTag = function(name, cb) {
    if (name === undefined || name === '') {
      var error = new Error('Validate Error.');
      error.status = 422;
      return cb(error);
    }
    Tag.find({
      where: {
        name: name,
      }})
      .then((res)=>{
        if (res.length === 0) {
          Tag.create({name: name})
          .then((newTag)=>{
            return cb(null, newTag);
          })
          .catch((err) => cb(err));
        } else {
          return cb(null, res[0]);
        }
      }).catch((err)=> cb(err));
  };
  Tag.remoteMethod('createTag', {
    http: {
      path: '/create-tag',
      verb: 'post',
    },
    accepts: {
      arg: 'name',
      type: 'string',
      required: true,
    },
    returns: {
      type: 'object',
      root: true,
    },
  });
};
