// Generador de códigos QR ISO/IEC 18004 para la demostración local
// Implementación pura en JavaScript sin dependencias externas (niveles 1 a 10, Nivel EC M, modo Byte).

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

// Parámetros de capacidad y corrección de error para versiones 1 a 10 (Nivel EC M)
// [totalCodewords, ecCodewordsPerBlock, numBlocksG1, dataCodewordsG1, numBlocksG2, dataCodewordsG2]
const EC_TABLE = [
  null,
  [26, 10, 1, 16, 0, 0], // V1: 16 bytes datos
  [44, 16, 1, 28, 0, 0], // V2: 28 bytes datos
  [70, 26, 1, 44, 0, 0], // V3: 44 bytes datos
  [100, 18, 2, 32, 0, 0], // V4: 64 bytes datos
  [134, 24, 2, 43, 0, 0], // V5: 86 bytes datos
  [172, 16, 4, 27, 0, 0], // V6: 108 bytes datos
  [196, 18, 4, 31, 0, 0], // V7: 124 bytes datos
  [242, 22, 2, 38, 2, 39], // V8: 154 bytes datos
  [292, 22, 3, 36, 2, 37], // V9: 182 bytes datos
  [346, 26, 4, 43, 1, 44], // V10: 216 bytes datos
];

const ALIGNMENT_PATTERN_POS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

function rsGeneratorPoly(n) {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], GF256_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = Array.from(next);
  }
  return poly;
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = res[i];
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], factor);
      }
    }
  }
  return res.slice(data.length);
}

function getFormatBits(mask) {
  const data = (0 /* EC Level M = 00 */ << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function encodeData(utf8Bytes, version) {
  const ecInfo = EC_TABLE[version];
  const totalDataBytes = ecInfo[2] * ecInfo[3] + ecInfo[4] * ecInfo[5];
  const bits = [];

  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  }

  // Indicador modo Byte: 0100
  pushBits(4, 4);
  // Conteo de caracteres (8 bits para V1-9, 16 para V10)
  pushBits(utf8Bytes.length, version <= 9 ? 8 : 16);
  // Bytes de contenido
  for (const b of utf8Bytes) pushBits(b, 8);
  // Terminador: hasta 4 ceros
  const remCapacityBits = totalDataBytes * 8 - bits.length;
  const termLen = Math.min(4, remCapacityBits);
  pushBits(0, termLen);
  // Alinear a byte
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = new Uint8Array(totalDataBytes);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataBytes[byteIdx++] = b;
  }
  // Relleno alternado 0xEC y 0x11
  let padByte = 0xec;
  while (byteIdx < totalDataBytes) {
    dataBytes[byteIdx++] = padByte;
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  const numBlocks1 = ecInfo[2];
  const lenBlock1 = ecInfo[3];
  const numBlocks2 = ecInfo[4];
  const lenBlock2 = ecInfo[5];
  const ecPerBlock = ecInfo[1];

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let b = 0; b < numBlocks1; b++) {
    const block = dataBytes.slice(offset, offset + lenBlock1);
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += lenBlock1;
  }
  for (let b = 0; b < numBlocks2; b++) {
    const block = dataBytes.slice(offset, offset + lenBlock2);
    dataBlocks.push(block);
    ecBlocks.push(rsEncode(block, ecPerBlock));
    offset += lenBlock2;
  }

  const totalCodewords = ecInfo[0];
  const interleaved = new Uint8Array(totalCodewords);
  let idx = 0;
  const maxDataLen = Math.max(lenBlock1, lenBlock2);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (i < dataBlocks[b].length) interleaved[idx++] = dataBlocks[b][i];
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      interleaved[idx++] = ecBlocks[b][i];
    }
  }

  return interleaved;
}

function createMatrix(version) {
  const size = version * 4 + 17;
  const m = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const isFunction = Array.from({ length: size }, () => new Uint8Array(size));

  function setFunctionModule(r, c, val) {
    m[r][c] = val ? 1 : 0;
    isFunction[r][c] = 1;
  }

  function placeFinder(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r;
        const col = c0 + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          setFunctionModule(row, col, 0);
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          setFunctionModule(row, col, 1);
        } else if (r === 1 || r === 5 || c === 1 || c === 5) {
          setFunctionModule(row, col, 0);
        } else {
          setFunctionModule(row, col, 1);
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  const alignCoords = ALIGNMENT_PATTERN_POS[version];
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const val = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunctionModule(r + dr, c + dc, val ? 1 : 0);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunctionModule(6, i, i % 2 === 0 ? 1 : 0);
    if (!isFunction[i][6]) setFunctionModule(i, 6, i % 2 === 0 ? 1 : 0);
  }

  setFunctionModule(size - 8, 8, 1);

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = 1;
    if (!isFunction[i][8]) isFunction[i][8] = 1;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = 1;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = 1;
  }

  return { size, m, isFunction };
}

function getMaskBit(mask, r, c) {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function applyFormatInfo(m, size, mask) {
  const bits = getFormatBits(mask);
  const coords1 = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const coords2 = [
    [size - 1, 8],
    [size - 2, 8],
    [size - 3, 8],
    [size - 4, 8],
    [size - 5, 8],
    [size - 6, 8],
    [size - 7, 8],
    [8, size - 8],
    [8, size - 7],
    [8, size - 6],
    [8, size - 5],
    [8, size - 4],
    [8, size - 3],
    [8, size - 2],
    [8, size - 1],
  ];
  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1;
    m[coords1[i][0]][coords1[i][1]] = bit;
    m[coords2[i][0]][coords2[i][1]] = bit;
  }
}

function fillData(matrixObj, codewords, mask) {
  const { size, m, isFunction } = matrixObj;
  const copy = m.map((row) => new Int8Array(row));
  let byteIdx = 0;
  let bitIdx = 7;
  let upward = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--;
    const cols = [rightCol, rightCol - 1];
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of cols) {
        if (isFunction[r][c]) continue;
        let bit = 0;
        if (byteIdx < codewords.length) {
          bit = (codewords[byteIdx] >> bitIdx) & 1;
          bitIdx--;
          if (bitIdx < 0) {
            bitIdx = 7;
            byteIdx++;
          }
        }
        if (getMaskBit(mask, r, c)) bit ^= 1;
        copy[r][c] = bit;
      }
    }
    upward = !upward;
  }
  applyFormatInfo(copy, size, mask);
  return copy;
}

function calculatePenalty(m, size) {
  let penalty = 0;
  for (let r = 0; r < size; r++) {
    let count = 0;
    let last = -1;
    for (let c = 0; c < size; c++) {
      if (m[r][c] === last) {
        count++;
      } else {
        if (count >= 5) penalty += 3 + (count - 5);
        last = m[r][c];
        count = 1;
      }
    }
    if (count >= 5) penalty += 3 + (count - 5);
  }
  for (let c = 0; c < size; c++) {
    let count = 0;
    let last = -1;
    for (let r = 0; r < size; r++) {
      if (m[r][c] === last) {
        count++;
      } else {
        if (count >= 5) penalty += 3 + (count - 5);
        last = m[r][c];
        count = 1;
      }
    }
    if (count >= 5) penalty += 3 + (count - 5);
  }

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const val = m[r][c];
      if (
        val === m[r + 1][c] &&
        val === m[r][c + 1] &&
        val === m[r + 1][c + 1]
      ) {
        penalty += 3;
      }
    }
  }

  let black = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r][c] === 1) black++;
    }
  }
  const percent = (black * 100) / (size * size);
  const prevMult = Math.floor(percent / 5) * 5;
  const nextMult = Math.ceil(percent / 5) * 5;
  const diff = Math.min(Math.abs(prevMult - 50), Math.abs(nextMult - 50));
  penalty += (diff / 5) * 10;

  return penalty;
}

function generateQr(text) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("El texto a codificar en el QR no puede estar vacío");
  }
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(text);

  let version = 1;
  while (version <= 10) {
    const ecInfo = EC_TABLE[version];
    const maxData = ecInfo[2] * ecInfo[3] + ecInfo[4] * ecInfo[5];
    const requiredBytes = utf8Bytes.length + (version <= 9 ? 2 : 3);
    if (requiredBytes <= maxData) break;
    version++;
  }
  if (version > 10) {
    throw new Error(
      "Texto demasiado largo para el generador QR local (máximo ~150 caracteres)",
    );
  }

  const codewords = encodeData(utf8Bytes, version);
  const matrixObj = createMatrix(version);

  let bestMask = 0;
  let minPenalty = Infinity;
  let bestMatrix = null;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = fillData(matrixObj, codewords, mask);
    const penalty = calculatePenalty(candidate, matrixObj.size);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = mask;
      bestMatrix = candidate;
    }
  }

  const size = matrixObj.size;
  const booleanMatrix = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => bestMatrix[r][c] === 1),
  );

  function toSvg({
    sizePx = 280,
    margin = 4,
    darkColor = "#111827",
    lightColor = "#ffffff",
  } = {}) {
    const totalSize = size + margin * 2;
    let pathD = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (booleanMatrix[r][c]) {
          pathD += `M${c + margin},${r + margin}h1v1h-1z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" role="img" aria-label="Código QR para reporte"><rect width="100%" height="100%" fill="${lightColor}"/><path d="${pathD.trim()}" fill="${darkColor}"/></svg>`;
  }

  function toAscii({ margin = 1 } = {}) {
    let res = "";
    for (let r = -margin; r < size + margin; r += 2) {
      for (let c = -margin; c < size + margin; c++) {
        const top =
          r >= 0 && r < size && c >= 0 && c < size
            ? booleanMatrix[r][c]
            : false;
        const bot =
          r + 1 >= 0 && r + 1 < size && c >= 0 && c < size
            ? booleanMatrix[r + 1][c]
            : false;
        if (top && bot) res += "█";
        else if (top && !bot) res += "▀";
        else if (!top && bot) res += "▄";
        else res += " ";
      }
      res += "\n";
    }
    return res;
  }

  return {
    version,
    size,
    mask: bestMask,
    matrix: booleanMatrix,
    toSvg,
    toAscii,
  };
}

function generateQrSvg(text, options = {}) {
  return generateQr(text).toSvg(options);
}

function generateQrAscii(text, options = {}) {
  return generateQr(text).toAscii(options);
}

module.exports = {
  generateQr,
  generateQrSvg,
  generateQrAscii,
};
