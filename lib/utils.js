// utils.js
//

'use strict';

var EventEmitter = require('events');
var fs = require('fs');
var zlib       = require('zlib');

var chalk      = require('chalk');
var micromatch = require('micromatch');
var progress   = require('progress-stream');
// var Promise    = require('bluebird');
var request    = require('request');
var tar        = require('tar-fs');

module.exports = {

  exists: function (path, cb) {
    // return new Promise(function (resolve, reject) {
    //   fs.access(path, fs.F_OK, function (err) {
    //     if (err) {
    //       reject(err);
    //     } else {
    //       resolve();
    //     }
    //   });
    // });

    fs.access(path, fs.F_OK, cb);
  },

  createError: function (msg, code) {
    var err  = new Error(msg);
    err.code = code;

    return err;
  },

  logErrorExit: function (err, exit) {
    console.error();
    console.error(chalk.red('Error:'), chalk.red(err.message));
    console.error();

    if (exit) {
      process.exit(1);
    }
  },

  download: function (url, file, options, cb) {
    cb = cb || noop;

    var progressStr = progress({ time: 50 });
    var emitter = new EventEmitter();

    progressStr.on('progress', function (progress) {
      emitter.emit('progress', Math.round(progress.percentage));
    });

    request(url, options)
      .on('response', function (response) {
        progressStr.setLength(Number(response.headers['content-length']));

        response.on('error', function (err) {
          cb(err);
        });
      })
      .on('error', function (err) {
        cb(err);
      })

      .pipe(progressStr)

      // Write 'file'.
      .pipe(fs.createWriteStream(file))
        .on('finish', function () {
          cb(null);
        });

    return emitter;
  },

  extractTarGz: function (archive, dest, patterns, cb) {
    cb = cb || noop;

    var stream = fs.createReadStream(archive);
    var stat = fs.statSync(archive); // To do: async.
    var progressStr = progress({
      time: 50,
      length: stat.size
    });
    var emitter = new EventEmitter();

    progressStr.on('progress', function (progress) {
      emitter.emit('progress', Math.round(progress.percentage));
    });

    stream
      .on('error', function (err) {
        cb(err);
      })

    .pipe(progressStr)

    // Gunzip.
    .pipe(zlib.createGunzip())
      .on('error', function (err) {
        cb(err);
      })

    // Untar.
    .pipe(tar.extract(dest, {
      ignore: function (path) {
        var isIgnored = false;

        for (var i = 0; patterns.length > i; i++) {
          if (micromatch.contains(path, patterns[i], { dot: true })) {
            isIgnored = true;
            break;
          }
        }

        return isIgnored;
      },

      dmode: Number('0555'),
      fmode: Number('0444'),
    }))
      .on('error', function (err) {
        cb(err);
      })
      .on('finish', function () {
        cb(null);
      });

    return emitter;
  },

  noop: noop,

};

function noop() {}
