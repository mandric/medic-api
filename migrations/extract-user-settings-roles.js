var async = require('async'),
    request = require('request'),
    url = require('url'),
    _ = require('underscore'),
    db = require('../db'),
    DB_ADMIN_ROLE = '_admin';

var updateUser = function(admins, row, callback) {
  db.medic.get(row.id, function(err, userSettingsDoc) {
    if (err) {
      return callback(err);
    }
    userSettingsDoc.roles = row.doc.roles;
    if (admins[row.doc.name]) {
      userSettingsDoc.roles.push(DB_ADMIN_ROLE);
    }
    db.medic.insert(userSettingsDoc, callback);
  });
};

var filterResults = function(rows) {
  return _.filter(rows, function(row) {
    return row.id.indexOf('org.couchdb.user:') === 0;
  });
};

var getAdmins = function(callback) {
  request.get({
    url: url.format({
      protocol: db.settings.protocol,
      hostname: db.settings.host,
      port: db.settings.port,
      pathname: '_config/admins'
    }),
    auth: {
      user: db.settings.username,
      pass: db.settings.password
    },
    json: true
  }, function(err, res) {
    callback(err, res && res.body);
  });
};

module.exports = {
  name: 'extract-user-settings-roles',
  created: new Date(2016, 4, 26, 15, 10, 0, 0),
  run: function(callback) {
    getAdmins(function(err, admins) {
      if (err) {
        return callback(err);
      }
      db._users.list({ include_docs: true }, function(err, result) {
        if (err) {
          return callback(err);
        }
        async.each(
          filterResults(result.rows),
          function(row, callback) {
            updateUser(admins, row, callback);
          },
          callback
        );
      });
    });
  }
};