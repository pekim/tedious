isZero = (array) ->
  for byte in array
    if byte != 0
      return false

  true

getNextRemainder = (array) ->
  remainder = 0

  for index in [array.length - 1..0] by -1
    s = (remainder * 256) + array[index]
    array[index] = Math.floor(s / 10)
    remainder = s % 10

  remainder

invert = (array) ->
  # Invert bits
  for byte, index in array
    array[index] = array[index] ^ 0xFF

  for byte, index in array
    array[index] = array[index] + 1
    if array[index] > 255
      array[index] = 0
    else
      break

formatArrayAsNumber = (array) ->
  result = ''
  if isZero(array)
    result= '0'
  else
    until isZero(array)
      t = getNextRemainder(array)
      result = t + result
  result
    
convertLEBytesToString = (buffer) ->
  array = Array.prototype.slice.call(buffer, 0, buffer.length)
  if array[array.length - 1] & 0x80
    sign = '-'
    invert(array)
  else
    sign = ''
  sign + formatArrayAsNumber( array )

convertUnsignedLEBytesToString = (buffer) ->
  array = Array.prototype.slice.call(buffer, 0, buffer.length)
  formatArrayAsNumber( array )

module.exports.convertLEBytesToString = convertLEBytesToString
module.exports.convertUnsignedLEBytesToString = convertUnsignedLEBytesToString
