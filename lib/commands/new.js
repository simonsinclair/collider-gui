// new.js
//

'use strict';

var pkg = require('../../package.json');

var collider = require('../collider');
var utils    = require('../utils');

var EventEmitter = require('events');
var cp   = require('child_process');
var fs   = require('fs');
var os   = require('os');
var path = require('path');

var Queue = require('queue');

module.exports = function (settings, done) {
  var emitter = new EventEmitter();
  var projectPath = path.join(settings.dir, settings.name);
  var tmpArchive  = path.join(os.tmpdir(), 'latest.tar.gz');

  var q = new Queue({ concurrency: 1 });

  // 1. Create project dir.
  q.push(function (cb) {
    fs.mkdir(projectPath, cb);
  });

  // 2. Download Collider release.
  q.push(function (cb) {
    var download = utils.download('http://getcollider.com/latest.tar.gz', tmpArchive, {
      headers: { 'User-Agent': `collider-gui/${pkg.version}`, },
      timeout: 10000,
    }, cb);

    download.on('progress', function (progress) {
      emitter.emit('download:progress', progress);
    });
  });

  // 3. Extract Collider release into project dir.
  q.push(function (cb) {
    var extract = utils.extractTarGz(tmpArchive, projectPath, [], cb);
    extract.on('progress', function (progress) {
      emitter.emit('extract:progress', progress);
    });
  });

  // 4. Write collider file.
  q.push(function (cb) {
    collider.save(projectPath, settings, cb);
  });

  // Go.
  q.start(function (err) {
    if (err) return done(err);
    done(null);
  });

  return emitter;
};
