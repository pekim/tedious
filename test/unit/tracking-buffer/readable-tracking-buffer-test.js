var TrackingBuffer = require('../../../src/tracking-buffer/tracking-buffer')
  .ReadableTrackingBuffer;

exports.createNoArgs = function(test) {
  var buffer = new TrackingBuffer();

  test.strictEqual(buffer.buffer.length, 0);
  test.strictEqual(buffer.encoding, 'utf8');

  test.done();
};

exports.createWithBuffer = function(test) {
  var inputBuffer = new Buffer([1, 2, 3]);
  var buffer = new TrackingBuffer(inputBuffer);

  test.strictEqual(buffer.buffer, inputBuffer);
  test.strictEqual(buffer.encoding, 'utf8');

  test.done();
};

exports.createWithEncoding = function(test) {
  var inputBuffer = new Buffer([1, 2, 3]);
  var buffer = new TrackingBuffer(inputBuffer, 'ucs2');

  test.strictEqual(buffer.buffer, inputBuffer);
  test.strictEqual(buffer.encoding, 'ucs2');

  test.done();
};

exports.notEnoughLeft = function(test) {
  var inputBuffer = new Buffer([1]);
  var buffer = new TrackingBuffer(inputBuffer);

  try {
    buffer.readUInt16LE();
    test.ok(false);
  } catch (error) {
    test.strictEqual(error.code, 'oob');
  }

  test.done();
};

exports.addBuffer = function(test) {
  var data = new Buffer([0x04, 0x00, 0x00, 0x00]);

  var buffer = new TrackingBuffer(data.slice(0, 2));

  try {
    buffer.readUInt32LE();
    test.ok(false);
  } catch (error) {
    test.strictEqual(error.code, 'oob');
  }

  buffer.add(data.slice(2, 4));
  test.strictEqual(buffer.readUInt32LE(), 4);

  test.done();
};

exports.readUnsignedInt = function(test) {
  var data = new Buffer([
    0x01,
    0x02,
    0x00,
    0x00,
    0x03,
    0x04,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x05,
    0x06,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00
  ]);

  var buffer = new TrackingBuffer(data);

  test.strictEqual(buffer.readUInt8(), 1);
  test.strictEqual(buffer.readUInt16LE(), 2);
  test.strictEqual(buffer.readUInt16BE(), 3);
  test.strictEqual(buffer.readUInt32LE(), 4);
  test.strictEqual(buffer.readUInt32BE(), 5);
  test.strictEqual(buffer.readUInt64LE(), 6);

  test.done();
};

exports.readSignedInt = function(test) {
  var data = new Buffer([
    0xff,
    0xfe,
    0xff,
    0xff,
    0xfd,
    0xfc,
    0xff,
    0xff,
    0xff,
    0xff,
    0xff,
    0xff,
    0xfb
  ]);

  var buffer = new TrackingBuffer(data);

  test.strictEqual(buffer.readInt8(), -1);

  test.strictEqual(buffer.readInt16LE(), -2);
  test.strictEqual(buffer.readInt16BE(), -3);
  test.strictEqual(buffer.readInt32LE(), -4);
  test.strictEqual(buffer.readInt32BE(), -5);

  test.done();
};

exports.readString = function(test) {
  var data = new Buffer([0x61, 0x00, 0x62, 0x00, 0x63, 0x00]);
  var buffer = new TrackingBuffer(data, 'ucs2');

  test.strictEqual(buffer.readString(data.length), 'abc');

  test.done();
};

exports.readBVarchar = function(test) {
  var data = new Buffer([0x03, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]);
  var buffer = new TrackingBuffer(data, 'ucs2');

  test.strictEqual(buffer.readBVarchar(), 'abc');

  test.done();
};

exports.readUsVarchar = function(test) {
  var data = new Buffer([0x03, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]);
  var buffer = new TrackingBuffer(data, 'ucs2');

  test.strictEqual(buffer.readUsVarchar(), 'abc');

  test.done();
};

exports.readBuffer = function(test) {
  var data = new Buffer([0x01, 0x02, 0x03, 0x04]);
  var buffer = new TrackingBuffer(data);

  buffer.readInt8();
  test.ok(buffer.readBuffer(2).equals(new Buffer([0x02, 0x03])));

  test.done();
};

exports.readAsStringInt64LE = function(test) {
  var data = new Buffer([0x01, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  var buffer = new TrackingBuffer(data);

  test.strictEqual(buffer.readAsStringInt64LE(), '513');

  test.done();
};

exports.readRollback = function(test) {
  var data = new Buffer([0x01, 0x00, 0x02, 0x00, 0x03, 0x00]);
  var buffer = new TrackingBuffer(data);

  test.strictEqual(buffer.readUInt16LE(), 1);
  test.strictEqual(buffer.readUInt16LE(), 2);
  buffer.rollback();
  test.strictEqual(buffer.readUInt16LE(), 2);
  test.strictEqual(buffer.readUInt16LE(), 3);

  test.done();
};
