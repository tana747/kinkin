'use strict';
var async = require('async');
module.exports = function(Productmenu) {
  Productmenu.productMenu = function(data, cb) {
    if ((data.menuId === undefined || data.menuId === '') || (!data.productId || data.productId.length === 0)) {
      var error = new Error('Validate Error.');
      error.status = 422;
      return cb(error);
    }
    const result = [];
    async.forEach(data.productId, function(item, eachCallback) {
      Productmenu.create({
        menuId: data.menuId,
        productId: item,
      }, function(err, productmenu) {
        if (err) {
          return eachCallback(err);
        }
        result.push(productmenu);
        eachCallback(null);
      });
    }, function(err) {
      if (err) {
        console.log(err);
        return cb(err);
      }
      return cb(null, result);
    });
  };
  Productmenu.remoteMethod('productMenu', {
    http: {
      path: '/create-productMenu',
      verb: 'post',
    },
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body',
      },
    }],
    returns: {
      type: 'object',
      root: true,
    },
  });
};
