import { sprintf } from 'sprintf-js';

import WritableTrackingBuffer from './tracking-buffer/writable-tracking-buffer';

const optionBufferSize = 20;

const TOKEN = {
  VERSION: 0x00,
  ENCRYPTION: 0x01,
  INSTOPT: 0x02,
  THREADID: 0x03,
  MARS: 0x04,
  FEDAUTHREQUIRED: 0x06,
  TERMINATOR: 0xFF
};

const ENCRYPT: { [key: string]: number } = {
  OFF: 0x00,
  ON: 0x01,
  NOT_SUP: 0x02,
  REQ: 0x03
};

const encryptByValue: { [key: number]: string } = {};

for (const name in ENCRYPT) {
  const value = ENCRYPT[name];
  encryptByValue[value] = name;
}

const MARS: { [key: string]: number } = {
  OFF: 0x00,
  ON: 0x01
};

const marsByValue: { [key: number]: string } = {};

for (const name in MARS) {
  const value = MARS[name];
  marsByValue[value] = name;
}

interface Options {
  encrypt: boolean;
  version: {
    major: number;
    minor: number;
    build: number;
    subbuild: number;
  };
  instanceName: string | undefined;
}

/*
  s2.2.6.4
 */
class PreloginPayload {
  data!: Buffer;
  options: Options;

  version!: {
    major: number;
    minor: number;
    build: number;
    subbuild: number;
  };

  encryption!: number;
  encryptionString!: string;

  instanceName!: string;

  threadId!: number;

  mars!: number;
  marsString!: string;
  fedAuthRequired!: number;

  constructor(bufferOrOptions: Buffer | Options = { encrypt: false, version: { major: 0, minor: 0, build: 0, subbuild: 0 }, instanceName: undefined }) {
    if (bufferOrOptions instanceof Buffer) {
      this.data = bufferOrOptions;
      this.options = { encrypt: false, version: { major: 0, minor: 0, build: 0, subbuild: 0 }, instanceName: undefined };
    } else {
      this.options = bufferOrOptions;
      this.createOptions();
    }
    this.extractOptions();
  }

  createOptions() {
    const options = [
      this.createVersionOption(),
      this.createEncryptionOption(),
      this.createInstanceNameOption(),
      this.createThreadIdOption(),
      this.createMarsOption(),
      this.createFedAuthOption()
    ];

    let length = 0;
    for (let i = 0, len = options.length; i < len; i++) {
      const option = options[i];
      length += 5 + option.data.length;
    }
    length++; // terminator
    this.data = Buffer.alloc(length, 0);
    let optionOffset = 0;
    let optionDataOffset = 5 * options.length + 1;

    for (let j = 0, len = options.length; j < len; j++) {
      const option = options[j];
      this.data.writeUInt8(option.token, optionOffset + 0);
      this.data.writeUInt16BE(optionDataOffset, optionOffset + 1);
      this.data.writeUInt16BE(option.data.length, optionOffset + 3);
      optionOffset += 5;
      option.data.copy(this.data, optionDataOffset);
      optionDataOffset += option.data.length;
    }

    this.data.writeUInt8(TOKEN.TERMINATOR, optionOffset);
  }

  createVersionOption() {
    const buffer = new WritableTrackingBuffer(optionBufferSize);
    buffer.writeUInt8(this.options.version.major);
    buffer.writeUInt8(this.options.version.minor);
    buffer.writeUInt16BE(this.options.version.build);
    buffer.writeUInt16BE(this.options.version.subbuild);
    return {
      token: TOKEN.VERSION,
      data: buffer.data
    };
  }

  createEncryptionOption() {
    const buffer = new WritableTrackingBuffer(optionBufferSize);
    if (this.options.encrypt) {
      buffer.writeUInt8(ENCRYPT.ON);
    } else {
      buffer.writeUInt8(ENCRYPT.NOT_SUP);
    }
    return {
      token: TOKEN.ENCRYPTION,
      data: buffer.data
    };
  }

  createInstanceNameOption() {
    const buffer = new WritableTrackingBuffer(optionBufferSize);
    if (this.options.instanceName !== undefined) {
      buffer.writeString(this.options.instanceName, 'utf8');
    }
    buffer.writeUInt8(0x00);
    return {
      token: TOKEN.INSTOPT,
      data: buffer.data
    };
  }

  createThreadIdOption() {
    const buffer = new WritableTrackingBuffer(optionBufferSize);
    buffer.writeUInt32BE(0x00);
    return {
      token: TOKEN.THREADID,
      data: buffer.data
    };
  }

  createMarsOption() {
    const buffer = new WritableTrackingBuffer(optionBufferSize);
    buffer.writeUInt8(MARS.OFF);
    return {
      token: TOKEN.MARS,
      data: buffer.data
    };
  }

  createFedAuthOption() {
    const buffer = new WritableTrackingBuffer(optionBufferSize);
    buffer.writeUInt8(0x01);
    return {
      token: TOKEN.FEDAUTHREQUIRED,
      data: buffer.data
    };
  }

  extractOptions() {
    let offset = 0;
    while (this.data[offset] !== TOKEN.TERMINATOR) {
      let dataOffset = this.data.readUInt16BE(offset + 1);
      const dataLength = this.data.readUInt16BE(offset + 3);
      switch (this.data[offset]) {
        case TOKEN.VERSION:
          this.extractVersion(dataOffset);
          break;
        case TOKEN.ENCRYPTION:
          this.extractEncryption(dataOffset);
          break;
        case TOKEN.INSTOPT:
          this.extractInstanceName(dataOffset, dataLength);
          break;
        case TOKEN.THREADID:
          if (dataLength > 0) {
            this.extractThreadId(dataOffset);
          }
          break;
        case TOKEN.MARS:
          this.extractMars(dataOffset);
          break;
        case TOKEN.FEDAUTHREQUIRED:
          this.extractFedAuth(dataOffset);
          break;
      }
      offset += 5;
      dataOffset += dataLength;
    }
  }

  extractVersion(offset: number) {
    this.version = {
      major: this.data.readUInt8(offset + 0),
      minor: this.data.readUInt8(offset + 1),
      build: this.data.readUInt16BE(offset + 2),
      subbuild: this.data.readUInt16BE(offset + 4)
    };
  }

  extractEncryption(offset: number) {
    this.encryption = this.data.readUInt8(offset);
    this.encryptionString = encryptByValue[this.encryption];
  }

  extractInstanceName(offset: number, dataLength: number) {
    if (dataLength === 0) {
      return;
    }
    this.instanceName = this.data.toString('utf8', offset, offset + dataLength);
  }

  extractThreadId(offset: number) {
    this.threadId = this.data.readUInt32BE(offset);
  }

  extractMars(offset: number) {
    this.mars = this.data.readUInt8(offset);
    this.marsString = marsByValue[this.mars];
  }

  extractFedAuth(offset: number) {
    this.fedAuthRequired = this.data.readUInt8(offset);
  }

  toString(indent = '') {
    return indent + 'PreLogin - ' + sprintf(
      'version:%d.%d.%d.%d, encryption:0x%02X(%s), instanceName:%s, threadId:0x%08X, mars:0x%02X(%s)',
      this.version.major, this.version.minor, this.version.build, this.version.subbuild,
      this.encryption ? this.encryption : 0,
      this.encryptionString ? this.encryptionString : '',
      this.instanceName ? this.instanceName : '',
      this.threadId ? this.threadId : 0,
      this.mars ? this.mars : 0,
      this.marsString ? this.marsString : ''
    );
  }
}

export default PreloginPayload;
module.exports = PreloginPayload;
