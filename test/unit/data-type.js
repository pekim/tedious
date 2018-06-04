var TYPES = require('../../src/data-type');
var WritableTrackingBuffer = require('../../src/tracking-buffer/writable-tracking-buffer');

function deprecationHandler() { }

exports['Data Types with alias'] = {
  setUp(done) {
    process.on('deprecation', deprecationHandler);
    done();
  },

  'should be available under both names': function(test) {
    for (var alias of [
      'UniqueIdentifier',
      'Date',
      'Time',
      'DateTime2',
      'DateTimeOffset'
    ]) {
      test.strictEqual(
        TYPES.typeByName[alias],
        TYPES.typeByName[`${alias}N`],
        `Alias ${alias} is not pointing to ${alias}N type.`
      );
    }

    test.done();
  },

  tearDown(done) {
    process.removeListener('deprecation', deprecationHandler);
    done();
  }
};

// Test date calculation for non utc date during daylight savings period
exports.smallDateTimeDaylightSaving = function(test) {
  var type = TYPES.typeByName['SmallDateTime'];
  for (var testSet of [
    [new Date(2015, 5, 18, 23, 59, 59), 42171],
    [new Date(2015, 5, 19, 0, 0, 0), 42172],
    [new Date(2015, 5, 19, 23, 59, 59), 42172],
    [new Date(2015, 5, 20, 0, 0, 0), 42173]
  ]) {
    var buffer = new WritableTrackingBuffer(8);
    var parameter = { value: testSet[0] };
    var expectedNoOfDays = testSet[1];
    type.writeParameterData(buffer, parameter, { useUTC: false });
    test.strictEqual(buffer.buffer.readUInt16LE(1), expectedNoOfDays);
  }
  test.done();
};

exports.dateTimeDaylightSaving = function(test) {
  var type = TYPES.typeByName['DateTime'];
  for (var testSet of [
    [new Date(2015, 5, 18, 23, 59, 59), 42171],
    [new Date(2015, 5, 19, 0, 0, 0), 42172],
    [new Date(2015, 5, 19, 23, 59, 59), 42172],
    [new Date(2015, 5, 20, 0, 0, 0), 42173]
  ]) {
    var buffer = new WritableTrackingBuffer(16);
    var parameter = { value: testSet[0] };
    var expectedNoOfDays = testSet[1];
    type.writeParameterData(buffer, parameter, { useUTC: false });
    test.strictEqual(buffer.buffer.readInt32LE(1), expectedNoOfDays);
  }
  test.done();
};

exports.dateTime2DaylightSaving = function(test) {
  var type = TYPES.typeByName['DateTime2'];
  for (const [value, expectedBuffer] of [
    [new Date(2015, 5, 18, 23, 59, 59), Buffer.from('067f5101163a0b', 'hex')],
    [new Date(2015, 5, 19, 0, 0, 0), Buffer.from('06000000173a0b', 'hex')],
    [new Date(2015, 5, 19, 23, 59, 59), Buffer.from('067f5101173a0b', 'hex')],
    [new Date(2015, 5, 20, 0, 0, 0), Buffer.from('06000000183a0b', 'hex')]
  ]) {
    var buffer = new WritableTrackingBuffer(16);
    type.writeParameterData(buffer, { value: value, scale: 0 }, { useUTC: false });
    test.deepEqual(buffer.data, expectedBuffer);
  }
  test.done();
};

exports.dateDaylightSaving = function(test) {
  var type = TYPES.typeByName['Date'];
  for (const [value, expectedBuffer] of [
    [new Date(2015, 5, 18, 23, 59, 59), Buffer.from('03163a0b', 'hex')],
    [new Date(2015, 5, 19, 0, 0, 0), Buffer.from('03173a0b', 'hex')],
    [new Date(2015, 5, 19, 23, 59, 59), Buffer.from('03173a0b', 'hex')],
    [new Date(2015, 5, 20, 0, 0, 0), Buffer.from('03183a0b', 'hex')]
  ]) {
    var buffer = new WritableTrackingBuffer(16);
    type.writeParameterData(buffer, { value: value }, { useUTC: false });

    test.deepEqual(buffer.data, expectedBuffer);
  }
  test.done();
};

// Test rounding of nanosecondDelta
exports.nanoSecondRounding = function(test) {
  const type = TYPES.typeByName['Time'];
  for (const [value, nanosecondDelta, scale, expectedBuffer] of [
    [new Date(2017, 6, 29, 17, 20, 3, 503), 0.0006264, 7, Buffer.from('0568fc624b91', 'hex')],
    [new Date(2017, 9, 1, 1, 31, 4, 12), 0.0004612, 7, Buffer.from('05c422ceb80c', 'hex')],
    [new Date(2017, 7, 3, 12, 52, 28, 373), 0.0007118, 7, Buffer.from('051e94c8e96b', 'hex')]
  ]) {
    const parameter = { value: value, scale: scale };
    parameter.value.nanosecondDelta = nanosecondDelta;

    const buffer = new WritableTrackingBuffer(16);
    type.writeParameterData(buffer, parameter, { useUTC: false });

    test.deepEqual(buffer.data, expectedBuffer);
  }
  test.done();
};
