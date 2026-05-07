// Small local LZ-string implementation for URL-safe map links.
// API-compatible with LZString.compressToEncodedURIComponent/decompressFromEncodedURIComponent.

const KEY_STR_URI_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
const BASE_REVERSE = new Map([...KEY_STR_URI_SAFE].map((ch, i) => [ch, i]));

function getBaseValue(char) {
  return BASE_REVERSE.get(char);
}

function compress(uncompressed, bitsPerChar, getCharFromInt) {
  if (uncompressed == null) return '';

  let i;
  let value;
  const contextDictionary = new Map();
  const contextDictionaryToCreate = new Set();
  let contextC = '';
  let contextW = '';
  let contextWc = '';
  let contextEnlargeIn = 2;
  let contextDictSize = 3;
  let contextNumBits = 2;
  const contextData = [];
  let contextDataVal = 0;
  let contextDataPosition = 0;

  const writeBit = bit => {
    contextDataVal = (contextDataVal << 1) | bit;
    if (contextDataPosition === bitsPerChar - 1) {
      contextDataPosition = 0;
      contextData.push(getCharFromInt(contextDataVal));
      contextDataVal = 0;
    } else {
      contextDataPosition++;
    }
  };

  const writeBits = (numBits, data) => {
    value = data;
    for (i = 0; i < numBits; i++) {
      writeBit(value & 1);
      value >>= 1;
    }
  };

  for (let ii = 0; ii < uncompressed.length; ii++) {
    contextC = uncompressed.charAt(ii);
    if (!contextDictionary.has(contextC)) {
      contextDictionary.set(contextC, contextDictSize++);
      contextDictionaryToCreate.add(contextC);
    }

    contextWc = contextW + contextC;
    if (contextDictionary.has(contextWc)) {
      contextW = contextWc;
    } else {
      if (contextDictionaryToCreate.has(contextW)) {
        if (contextW.charCodeAt(0) < 256) {
          writeBits(contextNumBits, 0);
          writeBits(8, contextW.charCodeAt(0));
        } else {
          writeBits(contextNumBits, 1);
          writeBits(16, contextW.charCodeAt(0));
        }
        contextEnlargeIn--;
        if (contextEnlargeIn === 0) {
          contextEnlargeIn = 2 ** contextNumBits;
          contextNumBits++;
        }
        contextDictionaryToCreate.delete(contextW);
      } else {
        writeBits(contextNumBits, contextDictionary.get(contextW));
      }
      contextEnlargeIn--;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits++;
      }
      contextDictionary.set(contextWc, contextDictSize++);
      contextW = String(contextC);
    }
  }

  if (contextW !== '') {
    if (contextDictionaryToCreate.has(contextW)) {
      if (contextW.charCodeAt(0) < 256) {
        writeBits(contextNumBits, 0);
        writeBits(8, contextW.charCodeAt(0));
      } else {
        writeBits(contextNumBits, 1);
        writeBits(16, contextW.charCodeAt(0));
      }
      contextEnlargeIn--;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits++;
      }
      contextDictionaryToCreate.delete(contextW);
    } else {
      writeBits(contextNumBits, contextDictionary.get(contextW));
    }
    contextEnlargeIn--;
    if (contextEnlargeIn === 0) {
      contextNumBits++;
    }
  }

  writeBits(contextNumBits, 2);

  while (true) {
    contextDataVal <<= 1;
    if (contextDataPosition === bitsPerChar - 1) {
      contextData.push(getCharFromInt(contextDataVal));
      break;
    }
    contextDataPosition++;
  }
  return contextData.join('');
}

function decompress(length, resetValue, getNextValue) {
  const dictionary = [0, 1, 2];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result = [];
  let i;
  let w;
  let bits;
  let resb;
  let maxpower;
  let power;
  let c;
  const data = { val: getNextValue(0), position: resetValue, index: 1 };

  const readBits = count => {
    bits = 0;
    maxpower = 2 ** count;
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }
    return bits;
  };

  const next = readBits(2);
  if (next === 0) {
    c = String.fromCharCode(readBits(8));
  } else if (next === 1) {
    c = String.fromCharCode(readBits(16));
  } else if (next === 2) {
    return '';
  }

  dictionary[3] = c;
  w = c;
  result.push(c);

  while (true) {
    if (data.index > length) return '';

    const cc = readBits(numBits);
    if (cc === 0) {
      dictionary[dictSize++] = String.fromCharCode(readBits(8));
      c = dictSize - 1;
      enlargeIn--;
    } else if (cc === 1) {
      dictionary[dictSize++] = String.fromCharCode(readBits(16));
      c = dictSize - 1;
      enlargeIn--;
    } else if (cc === 2) {
      return result.join('');
    } else {
      c = cc;
    }

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits++;
    }

    if (dictionary[c]) {
      entry = dictionary[c];
    } else if (c === dictSize) {
      entry = w + w.charAt(0);
    } else {
      return null;
    }
    result.push(entry);

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits++;
    }

    i = i;
  }
}

export function compressToEncodedURIComponent(input) {
  if (input == null) return '';
  return compress(input, 6, a => KEY_STR_URI_SAFE.charAt(a));
}

export function decompressFromEncodedURIComponent(input) {
  if (input == null) return '';
  if (input === '') return null;
  const normalized = input.replace(/ /g, '+');
  return decompress(normalized.length, 32, index => getBaseValue(normalized.charAt(index)));
}
