var Connection = require('../../src/connection');
var Request = require('../../src/request');
var TYPES = require('../../src/tedious').TYPES;
var fs = require('fs');

var config = JSON.parse(
  fs.readFileSync(require('os').homedir() + '/.tedious/test-connection.json', 'utf8')
).config;
config.options.tdsVersion = process.env.TEDIOUS_TDS_VERSION;

var TEST_SETUP_1 =
  'BEGIN TRY DROP PROCEDURE __tediousTvpTest DROP TYPE TediousTestType END TRY BEGIN CATCH END CATCH';
var TEST_SETUP_2 =
  'CREATE TYPE TediousTestType AS TABLE (a bit, b tinyint, c smallint, d int, e bigint, f real, g float, h varchar (100), i nvarchar (100), j datetime);';
var TEST_SETUP_3 =
  'CREATE PROCEDURE __tediousTvpTest (@tvp TediousTestType readonly) AS BEGIN select * from @tvp END';

var getConfig = function() {
  config.options.debug = {
    packet: true,
    data: true,
    payload: true,
    token: true,
    log: true
  };

  return config;
};

exports.callProcedureWithTVP = function(test) {
  config = getConfig();
  if (config.options.tdsVersion < '7_3_A') {
    console.log(`TVP is not supported on TDS ${config.options.tdsVersion}.`);
    test.done();
    return;
  }

  test.expect(13);

  var request = new Request(TEST_SETUP_1, function(err, rowCount) {
    connection.execSqlBatch(request2);
  });

  var request2 = new Request(TEST_SETUP_2, function(err, rowCount) {
    connection.execSqlBatch(request3);
  });

  var request3 = new Request(TEST_SETUP_3, function(err, rowCount) {
    connection.callProcedure(request4);
  });

  var request4 = new Request('__tediousTvpTest', function(err, rowCount) {
    connection.close();
  });

  request4.on('doneInProc', function(rowCount, more) {
    test.ok(more);
    test.strictEqual(rowCount, 1);
  });

  request4.on('row', function(columns) {
    test.strictEqual(columns[0].value, false);
    test.strictEqual(columns[1].value, 1);
    test.strictEqual(columns[2].value, 2);
    test.strictEqual(columns[3].value, 3);
    test.strictEqual(columns[4].value, '4');
    test.strictEqual(columns[5].value, 5.5);
    test.strictEqual(columns[6].value, 6.6);
    test.strictEqual(columns[7].value, 'asdf');
    test.strictEqual(columns[8].value, 'asdf');
    test.strictEqual(+columns[9].value, +new Date(Date.UTC(2014, 0, 1)));
  });

  var table = {
    columns: [
      {
        name: 'a',
        type: TYPES.Bit
      },
      {
        name: 'b',
        type: TYPES.TinyInt
      },
      {
        name: 'c',
        type: TYPES.SmallInt
      },
      {
        name: 'd',
        type: TYPES.Int
      },
      {
        name: 'e',
        type: TYPES.BigInt
      },
      {
        name: 'f',
        type: TYPES.Real
      },
      {
        name: 'g',
        type: TYPES.Float
      },
      {
        name: 'h',
        type: TYPES.VarChar,
        length: 100
      },
      {
        name: 'i',
        type: TYPES.NVarChar,
        length: 100
      },
      {
        name: 'j',
        type: TYPES.DateTime,
        length: 100
      }
    ],
    rows: [
      [
        false,
        1,
        2,
        3,
        4,
        5.5,
        6.6,
        'asdf',
        'asdf',
        new Date(Date.UTC(2014, 0, 1))
      ]
    ]
  };

  request4.addParameter('tvp', TYPES.TVP, table, {});

  var connection = new Connection(config);

  connection.on('connect', function(err) {
    test.ifError(err);
    connection.execSqlBatch(request);
  });

  connection.on('end', function(info) {
    test.done();
  });

  connection.on(
    'infoMessage',
    function(info) {}
    //console.log("#{info.number} : #{info.message}")
  );

  connection.on(
    'debug',
    function(text) {}
    //console.log(text)
  );
};
