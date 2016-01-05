'use strict';

var logentries = require('le_node'),
  _logentriesError = require('le_node/lib/node_modules/error'),
  Stream = require('stream').Stream,
  util = require('util'),
  LBS;

exports.LogentriesBunyanStream = LogentriesBunyanStream;
exports.createStream = function (config, options) {
  return new LogentriesBunyanStream(config, options);
};

/**
 * LogentriesBunyanStream
 *
 * @param {Object} config Logentries config
 * @param {String} config.token
 * @param {Function} [config.transform] transforms every log
 * @param {String} [config.defaultLevel] (defaults to `info`)
 * @param {Boolean} [config.failOnError] (defaults to true)
 */

function LogentriesBunyanStream(config, options) {
  if (!config || !config.token) throw new Error('config.token must be set');
  Stream.call(this);

  this.transform = options && options.transform;
  this.defaultLevel = options && options.defaultLevel || 'info';
  this.writable = true;
  this.failOnError = config && config.failOnError;

  config.levels = config.levels || ['debug', 'info', 'notice', 'warning', 'err', 'crit', 'alert', 'emerg'];
  this._logger = new logentries(config);
}

util.inherits(LogentriesBunyanStream, Stream);
LBS = LogentriesBunyanStream.prototype;

LBS.write = function (rec) {
  if (!rec) throw new Error('nothing passed to log');
  if (!this.writable) throw new Error('failed to write to a closed stream');
  if ('function' === typeof this.transform) rec = this.transform(rec);
  try {
    this._logger.log(this._resolveLevel(rec.level), rec);
  } catch (err) {
    if (err instanceof _logentriesError.LogentriesError) {
      console.error(err);
      if (this.failOnError === undefined || this.failOnError) { process.exit(1); }
    }
    else {
      // cannot handle this exception, so rethrow
      throw err;
    }
  }
};

LBS.end = function (rec) {
  if (arguments.length) this.write(rec);
  this.writable = false;
  this._logger.end();
};

LBS.destroy = function () {
  this.writable = false;
};

LBS._resolveLevel = function (bunyanLevel) {
  var levelToName = {
    10: 'trace',
    20: 'debug',
    30: 'info',
    40: 'warn',
    50: 'error',
    60: 'fatal'
  };
  return levelToName[bunyanLevel] || this.defaultLevel;
};
