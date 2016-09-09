// matter.js
//

'use strict';

var pkg = require('../package.json');
var utils = require('./utils');

var fs  = require('fs');
var cp  = require('child_process');
var url = require('url');

var _       = require('lodash');
var request = require('request');
var rimraf  = require('rimraf');
var Queue   = require('queue');
var which   = require('which');

module.exports = {

  getLibIndex: function (cb) {
    request({
      uri: 'http://getcollider.com/matter.json',
      json: true,
      headers: { 'User-Agent': `collider-gui/${pkg.version}`, },
    }, function (err, res, body) {
      if (err) return cb(err);
      cb(null, body.libs);
    });
  },

  getLibInfo: getLibInfo,

  updateImports: function (projectDir, locales, cb) {
    var imports = [];
    var data    = '';

    locales.forEach(function (locale) {
      imports.push(`@import "../${locale}/matter/index";`);
    });

    data = imports.join('\n');
    data += '\n';

    fs.writeFile(`${projectDir}/collider/_matter.scss`, data, cb);
  },

  clean: function (projectDir, libInfo, cb) {
    var locale = libInfo.locale;

    utils.exists(`${projectDir}/${locale}/matter/_matter.scss`, function (err) {

      // Callback silently if 'locale' is not a Matter lib.
      if (err) cb(null);

      rimraf(`${projectDir}/${locale}`, { disableGlob: true }, cb);
    });
  },

  clone: function (projectDir, libInfo, done) {
    var cloneUrl = url.parse(libInfo.repository);
    var locale   = libInfo.locale;

    var q = new Queue({ concurrency: 1 });

    // 1. Check if cloneUrl protocol is 'https:'.
    q.push(function (cb) {
      if (cloneUrl.protocol !== 'https:') {
        var err = utils.createError(
          `"${protocol}" is an unsupported protocol. URLs should start with "https:".`
        );
        cb(err);
      }

      cb(null);
    });

    // 2. Check Git is installed.
    q.push(function (cb) {
      which('git', cb);
    });

    // 3. Check 'cloneUrl.href' is a valid Git-remote.
    q.push(function (cb) {
      isValidGitRemote(cloneUrl.href, cb);
    });

    // 4. Verify lib. locale has the correct suffix.
    q.push(function (cb) {
      if (!locale.endsWith('-matter')) {
        var err = utils.createError(
          `Unsupported locale. "${locale}" should have a "-matter" suffix.`
        );
        cb(err);
      }

      cb(null);
    });

    // 5. Git clone the Matter lib.
    q.push(function (cb) {
      cp.spawn('git', ['clone', cloneUrl.href, `${projectDir}/${locale}`], { stdio: 'inherit' })
        .on('close', function (code) {
          if (code !== 0) {
            var err = utils.createError(
              `There was a problem cloning the Matter lib. from "${cloneUrl.href}".`
            );
            cb(err);
          }

          cb(null);
        });
    });

    // Go.
    q.start(function (err) {
      done(err);
    });
  },

};

function getLibInfo (index, id) {
  return _.find(index, ['id', id]);
}

/**
 * Uses `git ls-remote` to check if the given URL is an accessible Git repo.
 * @param  {String}  url A URL to a remote git repository.
 */
function isValidGitRemote(url, cb) {
  cp.exec(`git ls-remote ${url}`, cb);
}
