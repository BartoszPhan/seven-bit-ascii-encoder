# Seven Bit ASCII Encoder

Encodes arbitrary bytes into a 7-bit ASCII-safe string using an escape-byte-plus-hex scheme, and decodes it back. Every output byte is printable ASCII (0x20–0x7E) or the escape byte 0x1B followed by two hex digits.

```js
import { encode, decode } from './src/index.js';

const data = new Uint8Array([0x48, 0x69, 0x00, 0xff]);
const safe = encode(data);   // "Hi\x1b00\x1bFF"
const back = decode(safe);   // Uint8Array [0x48, 0x69, 0x00, 0xff]
```

## Why this exists

Some transports — serial links, old mail gateways, certain terminal pipelines — strip or mangle bytes outside the printable ASCII range. Base64 would work but uses `+` and `/`, which some of those same channels translate or drop. This library takes the simpler path: pass printable ASCII through untouched, escape everything else as `ESC` + two hex digits. The output stays readable for text payloads and round-trips exactly for binary.

The trade-off is size: binary-heavy input expands by roughly 3×. That is acceptable for the short control messages this is meant for.

## The awkward edge

The escape byte `0x1B` (ASCII ESC) is itself escaped as `ESC 1B`, so a decoder never has to guess whether an ESC is literal or an introducer. If you feed `decode` a string that was not produced by `encode`, it will throw on truncated escapes, invalid hex digits, or stray non-printable bytes rather than silently producing wrong output.

## API

- `encode(Uint8Array) -> string`
- `decode(string) -> Uint8Array`

`decode` accepts lowercase hex digits even though `encode` always emits uppercase.
