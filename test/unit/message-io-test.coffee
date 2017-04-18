Debug = require('../../src/debug')
Duplex = require('stream').Duplex
MessageIO = require('../../src/message-io')
OutgoingMessage = require('../../src/message/outgoing-message')
IncomingMessageStream = require('../../src/message/incoming-message-stream')
{ Packet, TYPE, HEADER_LENGTH } = require('../../src/packet')

class Connection extends Duplex
  _read: (size) ->

  _write: (chunk, encoding, callback) ->
    packet = new Packet(chunk)
    @emit('packet', packet)
    callback()

packetType = TYPE.SQL_BATCH
packetSize = HEADER_LENGTH + 4

exports.receiveOnePacket = (test) ->
  test.expect(1)

  payload = new Buffer([1, 2, 3])
  connection = new Connection()
  debug = new Debug()

  incomingMessageStream = new IncomingMessageStream(debug)
  incomingMessageStream.on('data', (message) ->
    message.on('data', (data) ->
      test.ok(data.equals(payload))
    )

    message.on('end', ->
      test.done()
    )
  )

  io = new MessageIO(connection, incomingMessageStream, packetSize, debug)

  packet = new Packet(packetType)
  packet.last(true)
  packet.addData(payload)
  connection.push(packet.buffer)

exports.receiveOnePacketInTwoChunks = (test) ->
  test.expect(1)

  payload = new Buffer([1, 2, 3])
  connection = new Connection()
  debug = new Debug()

  incomingMessageStream = new IncomingMessageStream(debug)
  incomingMessageStream.on('data', (message) ->
    message.on('data', (data) ->
      test.ok(data.equals(payload))
    )

    message.on('end', ->
      test.done()
    )
  )

  io = new MessageIO(connection, incomingMessageStream, packetSize, debug)

  packet = new Packet(packetType)
  packet.last(true)
  packet.addData(payload)
  connection.push(packet.buffer.slice(0, 4))
  connection.push(packet.buffer.slice(4))

exports.receiveTwoPackets = (test) ->
  test.expect(2)

  payload = new Buffer([1, 2, 3])
  payload1 = payload.slice(0, 2)
  payload2 = payload.slice(2, 3)

  connection = new Connection()
  debug = new Debug()
  incomingMessageStream = new IncomingMessageStream(debug)

  receivedPacketCount = 0

  incomingMessageStream.on('data', (message) ->
    message.on('data', (data) ->
      receivedPacketCount++

      switch receivedPacketCount
        when 1
          test.ok(data.equals(payload1))
        when 2
          test.ok(data.equals(payload2))
    )

    message.on('end', ->
      test.done()
    )
  )

  io = new MessageIO(connection, incomingMessageStream, packetSize, debug)

  packet = new Packet(packetType)
  packet.addData(payload1)
  connection.push(packet.buffer)

  packet = new Packet(packetType)
  packet.last(true)
  packet.addData(payload2)
  connection.push(packet.buffer)

exports.receiveTwoPacketsWithChunkSpanningPackets = (test) ->
  test.expect(2)

  payload = new Buffer([1, 2, 3, 4])
  payload1 = payload.slice(0, 2)
  payload2 = payload.slice(2, 4)

  connection = new Connection()
  debug = new Debug()
  incomingMessageStream = new IncomingMessageStream(debug)

  receivedPacketCount = 0

  incomingMessageStream.on('data', (message) ->
    message.on('data', (data) ->
      receivedPacketCount++

      switch receivedPacketCount
        when 1
          test.ok(data.equals(payload1))
        when 2
          test.ok(data.equals(payload2))
    )

    message.on('end', ->
      test.done()
    )
  )

  io = new MessageIO(connection, incomingMessageStream, packetSize, debug)

  packet1 = new Packet(packetType)
  packet1.addData(payload.slice(0, 2))

  packet2 = new Packet(packetType)
  packet2.last(true)
  packet2.addData(payload.slice(2, 4))

  connection.push(packet1.buffer.slice(0, 6))
  connection.push(Buffer.concat([packet1.buffer.slice(6), packet2.buffer.slice(0, 4)]))
  connection.push(packet2.buffer.slice(4))

exports.receiveMultiplePacketsWithMoreThanOnePacketFromOneChunk = (test) ->
  test.expect(1)

  payload = new Buffer([1, 2, 3, 4, 5, 6])
  payload1 = payload.slice(0, 2)
  payload2 = payload.slice(2, 4)
  payload3 = payload.slice(4, 6)

  connection = new Connection()
  receivedData = new Buffer(0)
  debug = new Debug()

  incomingMessageStream = new IncomingMessageStream(debug)
  incomingMessageStream.on('data', (message) ->
    message.on('data', (data) ->
      receivedData = Buffer.concat([receivedData, data])
    )

    message.on('end', ->
      test.deepEqual(payload, receivedData)
      test.done()
    )
  )

  io = new MessageIO(connection, incomingMessageStream, packetSize, debug)

  packet1 = new Packet(packetType)
  packet1.addData(payload.slice(0, 2))

  packet2 = new Packet(packetType)
  packet2.addData(payload.slice(2, 4))

  packet3 = new Packet(packetType)
  packet3.last(true)
  packet3.addData(payload.slice(4, 6))

  allData = Buffer.concat([packet1.buffer, packet2.buffer, packet3.buffer])
  data1 = allData.slice(0, 5)
  data2 = allData.slice(5)

  connection.push(data1)
  connection.push(data2)

exports.startOutgoingMessage = (test) ->
  connection = new Connection()
  connection.on('packet', (packet) ->
    test.ok(packet.last())
    test.strictEqual(packet.type(), packetType)
    test.ok(packet.data().equals(payload))

    test.done()
  )
  debug = new Debug()

  incomingMessageStream = new IncomingMessageStream(debug)
  io = new MessageIO(connection, incomingMessageStream, packetSize, debug)

  payload = new Buffer([1, 2, 3])

  message = io.startOutgoingMessage(packetType, false)
  message.end(payload)
