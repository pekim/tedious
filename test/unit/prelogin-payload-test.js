'use strict';

var PreloginPayload, assertPayload;

PreloginPayload = require('../../src/prelogin-payload');

exports.noEncrypt = function(test) {
  var payload;
  payload = new PreloginPayload();
  assertPayload(test, payload, 'NOT_SUP');
  return test.done();
};

exports.encrypt = function(test) {
  var payload;
  payload = new PreloginPayload({
    encrypt: true
  });
  assertPayload(test, payload, 'ON');
  return test.done();
};

exports.createFromBuffer = function(test) {
  var payload;
  payload = new PreloginPayload();
  new PreloginPayload(payload.data);
  assertPayload(test, payload, 'NOT_SUP');
  return test.done();
};

assertPayload = function(test, payload, encryptionString) {
  test.strictEqual(payload.version.major, 0);
  test.strictEqual(payload.version.minor, 0);
  test.strictEqual(payload.version.patch, 0);
  test.strictEqual(payload.version.trivial, 1);
  test.strictEqual(payload.version.subbuild, 1);
  test.strictEqual(payload.encryptionString, encryptionString);
  test.strictEqual(payload.instance, 0);
  test.strictEqual(payload.threadId, 0);
  return test.strictEqual(payload.marsString, 'OFF');
};
