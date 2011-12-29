parser = require('../../../lib/token/row-token-parser')
TYPE = require('../../../lib/token/token').TYPE
dataTypeByName = require('../../../lib/token/data-type').typeByName
WritableBuffer = require('../../../lib/tracking-buffer/tracking-buffer').WritableTrackingBuffer

writeBytes = (buffer, array) ->
  for b in array
    do (b) ->
      buffer.writeUInt8( b )

module.exports.bigint = (test) ->
  colMetaData = [{type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt},
                 {type: dataTypeByName.BigInt}]

  buffer = new WritableBuffer(0)

  buffer.writeUInt8(TYPE.ROW)
  writeBytes( buffer, [0,0,0,0,0,0,0,0,
                       1,0,0,0,0,0,0,0,
                       255,255,255,255,255,255,255,255,
                       2,0,0,0,0,0,0,0,
                       254,255,255,255,255,255,255,255,
                       255,255,255,255,255,255,255,127,
                       0,0,0,0,0,0,0,128,
                       10,0,0,0,0,0,0,0,
                       100,0,0,0,0,0,0,0,
                       232,3,0,0,0,0,0,0,
                       16,39,0,0,0,0,0,0] )
  buffer = buffer.data

  token = parser(buffer, 1, colMetaData)
  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 11)
  test.strictEqual("0", token.columns[0].value)
  test.strictEqual("1", token.columns[1].value)
  test.strictEqual("-1", token.columns[2].value)
  test.strictEqual("2", token.columns[3].value)
  test.strictEqual("-2", token.columns[4].value)
  test.strictEqual("9223372036854775807", token.columns[5].value)
  test.strictEqual("-9223372036854775808", token.columns[6].value)
  test.strictEqual("10", token.columns[7].value)
  test.strictEqual("100", token.columns[8].value)
  test.strictEqual("1000", token.columns[9].value)
  test.strictEqual("10000", token.columns[10].value)

  test.done()


module.exports.int = (test) ->
  colMetaData = [type: dataTypeByName.Int]

  value = 3

  buffer = new WritableBuffer(0)
  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt32LE(value)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].isNull)
  test.strictEqual(token.columns[0].value, value)
  test.strictEqual(token.columns[0].metadata, colMetaData[0])

  test.done()

module.exports.varChar = (test) ->
  colMetaData = [type: dataTypeByName.VarChar]

  value = 'abc'

  buffer = new WritableBuffer(0, 'ascii')
  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt16LE(value.length)
  buffer.writeString(value)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].isNull)
  test.strictEqual(token.columns[0].value, value)
  test.strictEqual(token.columns[0].metadata, colMetaData[0])

  test.done()

module.exports.nVarChar = (test) ->
  colMetaData = [type: dataTypeByName.NVarChar]

  value = 'abc'

  buffer = new WritableBuffer(0, 'ucs2')
  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt16LE(value.length * 2)
  buffer.writeString(value)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].isNull)
  test.strictEqual(token.columns[0].value, value)
  test.strictEqual(token.columns[0].metadata, colMetaData[0])

  test.done()

module.exports.intN = (test) ->
  colMetaData = [{type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN},
                 {type: dataTypeByName.IntN}]

  buffer = new WritableBuffer(0)

  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt8(0)
  writeBytes( buffer, [8, 0,0,0,0,0,0,0,0,
                        8, 1,0,0,0,0,0,0,0,
                        8, 255,255,255,255,255,255,255,255,
                        8, 2,0,0,0,0,0,0,0,
                        8, 254,255,255,255,255,255,255,255,
                        8, 255,255,255,255,255,255,255,127,
                        8, 0,0,0,0,0,0,0,128,
                        8, 10,0,0,0,0,0,0,0,
                        8, 100,0,0,0,0,0,0,0,
                        8, 232,3,0,0,0,0,0,0,
                        8, 16,39,0,0,0,0,0,0] )
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 12)
  test.ok(!token.columns[0].value)
  test.ok(token.columns[0].isNull)
  test.strictEqual("0", token.columns[1].value)
  test.strictEqual("1", token.columns[2].value)
  test.strictEqual("-1", token.columns[3].value)
  test.strictEqual("2", token.columns[4].value)
  test.strictEqual("-2", token.columns[5].value)
  test.strictEqual("9223372036854775807", token.columns[6].value)
  test.strictEqual("-9223372036854775808", token.columns[7].value)
  test.strictEqual("10", token.columns[8].value)
  test.strictEqual("100", token.columns[9].value)
  test.strictEqual("1000", token.columns[10].value)
  test.strictEqual("10000", token.columns[11].value)

  test.done()

module.exports.datetime = (test) ->
  colMetaData = [type: dataTypeByName.DateTime]

  days = 2                                        # 3rd January 1900
  threeHundredthsOfSecond = 45 * 300              # 45 seconds

  buffer = new WritableBuffer(0)

  buffer.writeUInt8(TYPE.ROW)
  buffer.writeInt32LE(days)
  buffer.writeUInt32LE(threeHundredthsOfSecond)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].isNull)
  test.strictEqual(token.columns[0].value.getTime(), new Date('January 3, 1900 00:00:45').getTime())

  test.done()

module.exports.datetimeN = (test) ->
  colMetaData = [type: dataTypeByName.DateTimeN]

  buffer = new WritableBuffer(0)

  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt8(0)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].value)
  test.ok(token.columns[0].isNull)

  test.done()

module.exports.numeric = (test) ->
  colMetaData = [
    type: dataTypeByName.NumericN
    precision: 3
    scale: 1
  ]

  value = -9.3

  buffer = new WritableBuffer(0)

  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt8(5)
  buffer.writeUInt8(0)      # negative
  buffer.writeUInt32LE(93)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].isNull)
  test.strictEqual(token.columns[0].value, value)

  test.done()

module.exports.numericN = (test) ->
  colMetaData = [
    type: dataTypeByName.NumericN
    precision: 3
    scale: 1
  ]

  buffer = new WritableBuffer(0)

  buffer.writeUInt8(TYPE.ROW)
  buffer.writeUInt8(0)
  buffer = buffer.data
  #console.log(buffer)

  token = parser(buffer, 1, colMetaData)
  #console.log(token)

  test.strictEqual(token.length, buffer.length - 1)
  test.strictEqual(token.columns.length, 1)
  test.ok(!token.columns[0].value)
  test.ok(token.columns[0].isNull)

  test.done()
