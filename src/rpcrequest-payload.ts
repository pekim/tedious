import WritableTrackingBuffer from './tracking-buffer/writable-tracking-buffer';
import { writeToTrackingBuffer } from './all-headers';
import { Parameter, ParameterData } from './data-type';
import { InternalConnectionOptions } from './connection';
import { encryptWithKey } from './always-encrypted/key-crypto';
import VarBinary from './data-types/varbinary';
import { CryptoMetadata } from './always-encrypted/types';
import { Collation } from './collation';

// const OPTION = {
//   WITH_RECOMPILE: 0x01,
//   NO_METADATA: 0x02,
//   REUSE_METADATA: 0x04
// };

const STATUS = {
  BY_REF_VALUE: 0x01,
  DEFAULT_VALUE: 0x02,
  ENCRYPTED_VALUE: 0x08,
};

/*
  s2.2.6.5
 */
class RpcRequestPayload implements AsyncIterable<Buffer> {
  procedure: string | number;
  parameters: Parameter[];

  options: InternalConnectionOptions;
  txnDescriptor: Buffer;
  collation: Collation | undefined;

  constructor(procedure: string | number, parameters: Parameter[], txnDescriptor: Buffer, options: InternalConnectionOptions, collation: Collation | undefined) {
    this.procedure = procedure;
    this.parameters = parameters;
    this.options = options;
    this.txnDescriptor = txnDescriptor;
    this.collation = collation;
  }

  [Symbol.asyncIterator]() {
    return this.generateData();
  }

  async* generateData() {
    const buffer = new WritableTrackingBuffer(500);
    if (this.options.tdsVersion >= '7_2') {
      const outstandingRequestCount = 1;
      writeToTrackingBuffer(buffer, this.txnDescriptor, outstandingRequestCount);
    }

    if (typeof this.procedure === 'string') {
      buffer.writeUsVarchar(this.procedure);
    } else {
      buffer.writeUShort(0xFFFF);
      buffer.writeUShort(this.procedure);
    }

    const optionFlags = 0;
    buffer.writeUInt16LE(optionFlags);
    yield buffer.data;

    const encryptedParams = await this._encryptParameters(this.parameters);
    for (let i = 0; i < this.parameters.length; i++) {
      yield * this.generateParameter(encryptedParams[i]);
    }
  }

  toString(indent = '') {
    return indent + ('RPC Request - ' + this.procedure);
  }

  *generateParameter(parameter: Parameter) {
    const buffer = new WritableTrackingBuffer(1 + 2 + Buffer.byteLength(parameter.name, 'ucs-2') + 1);
    buffer.writeBVarchar('@' + parameter.name);

    let statusFlags = 0;
    if (parameter.output) {
      statusFlags |= STATUS.BY_REF_VALUE;
    }
    if (parameter.cryptoMetadata) {
      statusFlags |= STATUS.ENCRYPTED_VALUE;
    }
    buffer.writeUInt8(statusFlags);
    yield buffer.data;

    if (parameter.cryptoMetadata) {
      yield* this._generateEncryptedParameter(parameter);
    } else {
      yield* this.generateParameterData(parameter, true);
    }
  }

  *generateParameterData(parameter: Parameter, writeValue: boolean) {
    const buffer = new WritableTrackingBuffer(1 + 2 + Buffer.byteLength(parameter.name, 'ucs-2') + 1);
    const param: ParameterData = {
      value: parameter.value,
      cryptoMetadata: parameter.cryptoMetadata
    };

    yield buffer.data;

    const type = parameter.type;

    if ((type.id & 0x30) === 0x20) {
      if (parameter.length) {
        param.length = parameter.length;
      } else if (type.resolveLength) {
        param.length = type.resolveLength(parameter);
      }
    }

    if (parameter.precision) {
      param.precision = parameter.precision;
    } else if (type.resolvePrecision) {
      param.precision = type.resolvePrecision(parameter);
    }

    if (parameter.scale) {
      param.scale = parameter.scale;
    } else if (type.resolveScale) {
      param.scale = type.resolveScale(parameter);
    }

    if (this.collation) {
      param.collation = this.collation;
    }

    const typeINfo = type.generateTypeInfo(param, this.options);
    yield typeINfo;
    if (writeValue) {
      yield type.generateParameterLength(param, this.options);
      yield * type.generateParameterData(param, this.options);
    }
  }

  *_generateEncryptedParameter(parameter: Parameter) {
    const encryptedParam = {
      value: parameter.encryptedVal,
      type: VarBinary,
      output: parameter.output,
      name: parameter.name,
      forceEncrypt: parameter.forceEncrypt
    };
    yield* this.generateParameterData(encryptedParam, true);
    yield* this.generateParameterData(parameter, false);
    yield* this._writeEncryptionMetadata(parameter.cryptoMetadata);

  }

  _encryptParameters(parameters: Parameter[]): Promise<Parameter[]> | Parameter[] {
    return new Promise((resolve) => {
      if (this.options.serverSupportsColumnEncryption === true) {
        const promises: Promise<void>[] = [];

        for (let i = 0, len = parameters.length; i < len; i++) {
          const type = parameters[i].type;
          const paramValue = parameters[i].value;
          if (parameters[i].cryptoMetadata && (paramValue !== undefined && paramValue !== null)) {
            if (!type.toBuffer) {
              throw new Error(`Column encryption error. Cannot convert type ${type.name} to buffer.`);
            }
            const plainTextBuffer = type.toBuffer(parameters[i], this.options);
            if (plainTextBuffer) {
              promises.push(encryptWithKey(plainTextBuffer, parameters[i].cryptoMetadata as CryptoMetadata, this.options).then((encryptedValue: Buffer) => {
                parameters[i].encryptedVal = encryptedValue;
              }));
            }
          }
        }

        Promise.all(promises).then(() => resolve(parameters));
      } else {
        resolve(parameters);
      }
    });

  }

  *_writeEncryptionMetadata(cryptoMetadata: CryptoMetadata | undefined) {
    if (!cryptoMetadata || !cryptoMetadata.cekEntry || !cryptoMetadata.cekEntry.columnEncryptionKeyValues || cryptoMetadata.cekEntry.columnEncryptionKeyValues.length <= 0) {
      throw new Error('Invalid Crypto Metadata in _writeEncryptionMetadata');
    }

    const buffer = new WritableTrackingBuffer(0);

    buffer.writeUInt8(cryptoMetadata.cipherAlgorithmId);
    if (cryptoMetadata.cipherAlgorithmId === 0) {
      buffer.writeBVarchar(cryptoMetadata.cipherAlgorithmName || '');
    }

    buffer.writeUInt8(cryptoMetadata.encryptionType);
    buffer.writeUInt32LE(cryptoMetadata.cekEntry.columnEncryptionKeyValues[0].dbId);
    buffer.writeUInt32LE(cryptoMetadata.cekEntry.columnEncryptionKeyValues[0].keyId);
    buffer.writeUInt32LE(cryptoMetadata.cekEntry.columnEncryptionKeyValues[0].keyVersion);
    buffer.writeBuffer(cryptoMetadata.cekEntry.columnEncryptionKeyValues[0].mdVersion);
    buffer.writeUInt8(cryptoMetadata.normalizationRuleVersion[0]);
    yield buffer.data;
  }
}

export default RpcRequestPayload;
module.exports = RpcRequestPayload;
