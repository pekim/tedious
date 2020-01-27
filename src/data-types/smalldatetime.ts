import { DataType } from '../data-type';
import DateTimeN from './datetimen';
import WritableTrackingBuffer from '../tracking-buffer/writable-tracking-buffer';

const EPOCH_DATE = new Date(1900, 0, 1);
const UTC_EPOCH_DATE = new Date(Date.UTC(1900, 0, 1));

const SmallDateTime: DataType = {
  id: 0x3A,
  type: 'DATETIM4',
  name: 'SmallDateTime',

  declaration: function() {
    return 'smalldatetime';
  },

  writeTypeInfo: function(buffer) {
    buffer.writeUInt8(DateTimeN.id);
    buffer.writeUInt8(4);
  },

  writeParameterData: function(buff, parameter, options, cb) {
    buff.writeBuffer(Buffer.concat(Array.from(this.generate(parameter, options))));
    cb();
  },

  generate: function*(parameter, options) {
    if (parameter.value != null) {
      const buffer = new WritableTrackingBuffer(8);
      let days, dstDiff, minutes;
      if (options.useUTC) {
        days = Math.floor((parameter.value.getTime() - UTC_EPOCH_DATE.getTime()) / (1000 * 60 * 60 * 24));
        minutes = (parameter.value.getUTCHours() * 60) + parameter.value.getUTCMinutes();
      } else {
        dstDiff = -(parameter.value.getTimezoneOffset() - EPOCH_DATE.getTimezoneOffset()) * 60 * 1000;
        days = Math.floor((parameter.value.getTime() - EPOCH_DATE.getTime() + dstDiff) / (1000 * 60 * 60 * 24));
        minutes = (parameter.value.getHours() * 60) + parameter.value.getMinutes();
      }

      buffer.writeUInt8(4);
      buffer.writeUInt16LE(days);

      buffer.writeUInt16LE(minutes);
      yield buffer.data;
    } else {
      const buffer = new WritableTrackingBuffer(1);
      buffer.writeUInt8(0);
      yield buffer.data;
    }
  },

  toBuffer: function(parameter, options) {
    const value = parameter.value as Date;

    if (value != null) {
      let days, dstDiff, minutes;
      if (options.useUTC) {
        days = Math.floor((value.getTime() - UTC_EPOCH_DATE.getTime()) / (1000 * 60 * 60 * 24));
        minutes = (value.getUTCHours() * 60) + value.getUTCMinutes();
      } else {
        dstDiff = -(value.getTimezoneOffset() - EPOCH_DATE.getTimezoneOffset()) * 60 * 1000;
        days = Math.floor((value.getTime() - EPOCH_DATE.getTime() + dstDiff) / (1000 * 60 * 60 * 24));
        minutes = (value.getHours() * 60) + value.getMinutes();
      }

      const result = Buffer.alloc(4);
      result.writeUInt16LE(days, 0);
      result.writeUInt16LE(minutes, 2);

      return result;
    } else {
      return Buffer.from([]);
    }
  },

  validate: function(value): null | Date| TypeError {
    if (value == null) {
      return null;
    }

    if (!(value instanceof Date)) {
      value = new Date(Date.parse(value));
    }

    if (isNaN(value)) {
      return new TypeError('Invalid date.');
    }

    return value;
  }
};

export default SmallDateTime;
module.exports = SmallDateTime;
