import { DataType } from '../data-type';
import BitN from './bitn';

const DATA_LENGTH = Buffer.from([0x01]);
const NULL_LENGTH = Buffer.from([0x00]);

const Bit: DataType = {
  id: 0x32,
  type: 'BIT',
  name: 'Bit',

  declaration: function() {
    return 'bit';
  },

  generateTypeInfo() {
    return Buffer.from([BitN.id, 0x01]);
  },

  generateParameterLength(parameter, options) {
    if (parameter.value == null) {
      return NULL_LENGTH;
    }

    return DATA_LENGTH;
  },

  * generateParameterData(parameter, options) {
    if (parameter.value == null) {
      return;
    }

    yield parameter.value ? Buffer.from([0x01]) : Buffer.from([0x00]);
  },

  toBuffer: function(parameter) {
    if (parameter.value != null) {
      // Always Encrypted length must be normalized to 8 bytes for bit
      const buffer = Buffer.alloc(8);
      buffer.writeInt8(parameter.value ? 1 : 0, 0);
      return buffer;
    }
  },

  validate: function(value): null | boolean {
    if (value == null) {
      return null;
    }
    if (value) {
      return true;
    } else {
      return false;
    }
  }
};

export default Bit;
module.exports = Bit;
