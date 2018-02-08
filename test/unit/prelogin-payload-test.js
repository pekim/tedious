var PreloginPayload = require('../../src/prelogin-payload');

exports.noEncrypt = function(test) {
  var payload = new PreloginPayload();

  assertPayload(test, payload, 'NOT_SUP');

  test.done();
};

exports.encrypt = function(test) {
  var payload = new PreloginPayload({ encrypt: true });

  assertPayload(test, payload, 'ON');

  test.done();
};

exports.createFromBuffer = function(test) {
  var payload = new PreloginPayload();
  new PreloginPayload(payload.data);

  assertPayload(test, payload, 'NOT_SUP');

  test.done();
};

exports.noFedAuth = function(test) {
  var payload = new PreloginPayload({ encrypt: true, fedAuthRequested: false });

  assertFedauthPayload(test, payload, undefined);

  test.done();
};

exports.fedAuth = function(test) {
  var payload = new PreloginPayload({ encrypt: true, fedAuthRequested: true });

  assertFedauthPayload(test, payload, 1);

  test.done();
};

var assertPayload = function(test, payload, encryptionString) {
  test.strictEqual(payload.version.major, 0);
  test.strictEqual(payload.version.minor, 0);
  test.strictEqual(payload.version.patch, 0);
  test.strictEqual(payload.version.trivial, 1);
  test.strictEqual(payload.version.subbuild, 1);

  test.strictEqual(payload.encryptionString, encryptionString);
  test.strictEqual(payload.instance, 0);
  test.strictEqual(payload.threadId, 0);
  test.strictEqual(payload.marsString, 'OFF');
};

var assertFedauthPayload = function(test, payload, fedauth) {
  test.strictEqual(payload.version.major, 0);
  test.strictEqual(payload.version.minor, 0);
  test.strictEqual(payload.version.patch, 0);
  test.strictEqual(payload.version.trivial, 1);
  test.strictEqual(payload.version.subbuild, 1);

  test.strictEqual(payload.encryptionString, 'ON');
  test.strictEqual(payload.instance, 0);
  test.strictEqual(payload.threadId, 0);
  test.strictEqual(payload.marsString, 'OFF');
  test.strictEqual(payload.fedAuthRequired, fedauth);
};
