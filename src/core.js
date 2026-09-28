/**
 * Seven Bit ASCII Encoder
 *
 * Encodes arbitrary bytes into a 7-bit ASCII-safe representation for transport
 * channels that cannot carry the full 8-bit byte range. The encoding is
 * designed to be trivially reversible and to produce output that survives any
 * line-oriented, 7-bit-clean transport.
 *
 * Design decision: we use a single escape byte (0x1B, ASCII ESC) followed by
 * two uppercase hex digits for any byte that is not printable ASCII text. This
 * keeps the output human-readable for text payloads while guaranteeing that
 * every byte round-trips. We deliberately do NOT use base64 because the brief
 * asks for 7-bit ASCII safety, and base64's '+' and '/' characters are not
 * safe on all legacy transports (some strip or translate them). Every byte of
 * our output is in the range 0x20-0x7E plus the escape byte itself, which is
 * the one non-printable we need and which we always follow with printable hex.
 *
 * The awkward edge: the escape byte 0x1B is itself encoded as ESC "1B", so
 * there is never ambiguity in the output stream. A decoder never has to guess
 * whether an ESC is a literal or an introducer.
 */

const ESC = 0x1b;

const HEX = '0123456789ABCDEF';

/**
 * Returns true for bytes that pass through unchanged.
 *
 * We pass through printable ASCII (0x20-0x7E) except the escape byte itself,
 * which must be escaped to avoid ambiguity. Everything else — control
 * characters, DEL, and all high-bit bytes — is hex-escaped.
 */
function isPassthrough(byte) {
  return byte >= 0x20 && byte <= 0x7e && byte !== ESC;
}

/**
 * Encode a byte array into a 7-bit ASCII-safe string.
 *
 * @param {Uint8Array} input - bytes to encode.
 * @returns {string} ASCII-safe string.
 */
export function encode(input) {
  if (!(input instanceof Uint8Array)) {
    throw new TypeError('encode expects a Uint8Array');
  }
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const b = input[i];
    if (isPassthrough(b)) {
      out += String.fromCharCode(b);
    } else {
      out += String.fromCharCode(ESC);
      out += HEX[(b >> 4) & 0x0f];
      out += HEX[b & 0x0f];
    }
  }
  return out;
}

/**
 * Decode a string produced by encode() back into the original bytes.
 *
 * @param {string} input - ASCII-safe string from encode().
 * @returns {Uint8Array} original bytes.
 */
export function decode(input) {
  if (typeof input !== 'string') {
    throw new TypeError('decode expects a string');
  }
  const bytes = [];
  let i = 0;
  while (i < input.length) {
    const c = input.charCodeAt(i);
    if (c === ESC) {
      if (i + 2 >= input.length) {
        throw new Error('truncated escape sequence at position ' + i);
      }
      const hi = hexValue(input.charCodeAt(i + 1));
      const lo = hexValue(input.charCodeAt(i + 2));
      if (hi < 0 || lo < 0) {
        throw new Error('invalid hex digit at position ' + (i + 1));
      }
      bytes.push((hi << 4) | lo);
      i += 3;
    } else if (c >= 0x20 && c <= 0x7e) {
      bytes.push(c);
      i += 1;
    } else {
      throw new Error('non-printable byte at position ' + i + ' is not a valid escape');
    }
  }
  return new Uint8Array(bytes);
}

function hexValue(ch) {
  if (ch >= 0x30 && ch <= 0x39) return ch - 0x30;
  if (ch >= 0x41 && ch <= 0x46) return ch - 0x41 + 10;
  if (ch >= 0x61 && ch <= 0x66) return ch - 0x61 + 10;
  return -1;
}
