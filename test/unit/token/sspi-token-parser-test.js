'use strict';

var Parser, WriteBuffer;

Parser = require('../../../src/token/stream-parser');

WriteBuffer = require('../../../src/tracking-buffer/writable-tracking-buffer');

exports.parseChallenge = function(test) {
  var challenge, data, expected, parser, source;
  source = new WriteBuffer(68);
  source.writeUInt8(0xED);
  source.writeUInt16LE(0);
  source.writeString('NTLMSSP\0', 'utf8');
  source.writeInt32LE(2);
  source.writeInt16LE(12);
  source.writeInt16LE(12);
  source.writeInt32LE(111);
  source.writeInt32LE(11256099);
  source.copyFrom(new Buffer([0xa1, 0xb2, 0xc3, 0xd4, 0xe5, 0xf6, 0xa7, 0xb8]));
  source.copyFrom(new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  source.writeInt16LE(4);
  source.writeInt16LE(4);
  source.writeInt32LE(222);
  source.copyFrom(new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]));
  source.writeString('domain', 'ucs2');
  source.writeInt32BE(11259375);
  parser = new Parser({
    token: function() {}
  }, {}, {});
  data = source.data;
  data.writeUInt16LE(data.length - 3, 1);
  parser.write(data);
  challenge = parser.read();
  expected = {
    magic: 'NTLMSSP\0',
    type: 2,
    domainLen: 12,
    domainMax: 12,
    domainOffset: 111,
    flags: 11256099,
    nonce: new Buffer([0xa1, 0xb2, 0xc3, 0xd4, 0xe5, 0xf6, 0xa7, 0xb8]),
    zeroes: new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    targetLen: 4,
    targetMax: 4,
    targetOffset: 222,
    oddData: new Buffer([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]),
    domain: 'domain',
    target: new Buffer([0x00, 0xab, 0xcd, 0xef])
  };
  test.deepEqual(challenge.ntlmpacket, expected);
  return test.done();
};
