// s2.2.7.16
import { readInt32LE, Result } from './helpers';
import { type ParserOptions } from './stream-parser';

import { ReturnStatusToken } from './token';

function returnStatusParser(buf: Buffer, offset: number, _options: ParserOptions): Result<ReturnStatusToken> {
  let value;
  ({ value, offset } = readInt32LE(buf, offset));
  return new Result(new ReturnStatusToken(value), offset);
}

export default returnStatusParser;
module.exports = returnStatusParser;
