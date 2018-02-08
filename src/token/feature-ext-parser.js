
module.exports = function featureExtAckParser(parser, colMetadata, options, callback) {
  function next(done) {
    parser.readUInt8((featureId) => {
      if (featureId === 0xFF) {
        return done();
      }
      parser.readUInt32LE((featureAckDataLen) => {
        parser.readBuffer(featureAckDataLen, (featureData) => {
          //len must be zero
          next(done);
        });
      });
    });
  }
  next(() => {
    callback(undefined);
  });
};
