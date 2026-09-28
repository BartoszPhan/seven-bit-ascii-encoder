import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode } from '../src/index.js';

function bytes(...arr) {
  return new Uint8Array(arr);
}

test('plain ASCII text passes through unchanged', () => {
  const input = bytes(0x48, 0x65, 0x6c, 0x6c, 0x6f); // "Hello"
  assert.equal(encode(input), 'Hello');
  assert.deepEqual(decode('Hello'), input);
});

test('empty input round-trips', () => {
  assert.equal(encode(new Uint8Array(0)), '');
  assert.deepEqual(decode(''), new Uint8Array(0));
});

test('high-bit bytes are hex-escaped', () => {
  const input = bytes(0xff, 0x80, 0x01);
  const encoded = encode(input);
  assert.equal(encoded, '\x1bFF\x1b80\x1b01');
  assert.deepEqual(decode(encoded), input);
});

test('escape byte itself is escaped', () => {
  const input = bytes(0x1b);
  const encoded = encode(input);
  assert.equal(encoded, '\x1b1B');
  assert.deepEqual(decode(encoded), input);
});

test('control characters are escaped', () => {
  const input = bytes(0x00, 0x0a, 0x0d);
  const encoded = encode(input);
  assert.equal(encoded, '\x1b00\x1b0A\x1b0D');
  assert.deepEqual(decode(encoded), input);
});

test('DEL byte is escaped', () => {
  const input = bytes(0x7f);
  assert.equal(encode(input), '\x1b7F');
  assert.deepEqual(decode(encode(input)), input);
});

test('mixed text and binary round-trips', () => {
  const input = bytes(0x54, 0x65, 0x78, 0x74, 0x00, 0xff, 0x21); // "Text" + NUL + 0xFF + "!"
  const encoded = encode(input);
  assert.equal(encoded, 'Text\x1b00\x1bFF!');
  assert.deepEqual(decode(encoded), input);
});

test('lowercase hex in input is accepted by decode', () => {
  // decode should accept lowercase hex even though encode produces uppercase,
  // because the decoder uses a tolerant hex parser.
  assert.deepEqual(decode('\x1bff'), bytes(0xff));
});

test('decode rejects truncated escape', () => {
  assert.throws(() => decode('\x1bF'), /truncated escape/);
  assert.throws(() => decode('\x1b'), /truncated escape/);
});

test('decode rejects invalid hex digit', () => {
  assert.throws(() => decode('\x1bGG'), /invalid hex digit/);
});

test('decode rejects non-printable that is not an escape', () => {
  assert.throws(() => decode('\x00'), /non-printable byte/);
  assert.throws(() => decode('\x7f'), /non-printable byte/);
});

test('encode rejects non-Uint8Array', () => {
  assert.throws(() => encode([1, 2, 3]), TypeError);
  assert.throws(() => encode('abc'), TypeError);
});

test('decode rejects non-string', () => {
  assert.throws(() => decode(123), TypeError);
  assert.throws(() => decode(bytes(1)), TypeError);
});

test('all 256 byte values round-trip', () => {
  const all = new Uint8Array(256);
  for (let i = 0; i < 256; i++) all[i] = i;
  const encoded = encode(all);
  assert.deepEqual(decode(encoded), all);
});

test('space and tilde pass through', () => {
  // 0x20 and 0x7E are the boundaries of printable ASCII.
  assert.equal(encode(bytes(0x20, 0x7e)), ' ~');
});
