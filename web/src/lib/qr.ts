// Minimal QR code generator (Canvas) for short strings/URLs.
// Based on the well-known public-domain / MIT-style "qrcode-generator" approach (Kazuhiko Arase),
// adapted to TypeScript and trimmed for our use case (single QR, canvas render).
// Intentionally self-contained to avoid adding dependencies for a hackathon demo.

type QRErrorCorrectLevel = "L" | "M" | "Q" | "H";

type DrawQrOptions = {
  size: number; // px
  padding?: number; // px
  darkColor?: string;
  lightColor?: string;
  ecLevel?: QRErrorCorrectLevel;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

const EC_LEVEL_MAP: Record<QRErrorCorrectLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

/**
 * Draw a QR code to a canvas.
 * Notes:
 * - Intended for URLs and short text.
 * - Uses automatic type number selection.
 */
export function drawQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  opts: DrawQrOptions,
) {
  const size = Math.max(64, Math.min(1024, Math.round(opts.size)));
  const padding = Math.max(0, Math.round(opts.padding ?? 12));
  const dark = opts.darkColor ?? "#0b1220";
  const light = opts.lightColor ?? "#ffffff";
  const ec = opts.ecLevel ?? "M";

  const qr = createQr(0, ec);
  qr.addData(text);
  qr.make();

  const moduleCount: number = qr.getModuleCount();
  const innerSize = Math.max(1, size - padding * 2);
  const cell = Math.floor(innerSize / moduleCount);
  const drawSize = cell * moduleCount;
  const offset = Math.floor((size - drawSize) / 2);

  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = dark;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// QR implementation (trimmed port)
// -----------------------------------------------------------------------------

function createQr(typeNumber: number, errorCorrectLevel: QRErrorCorrectLevel) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new (QrCode as AnyObj)(typeNumber, EC_LEVEL_MAP[errorCorrectLevel]);
}

// The remainder is a compacted QR implementation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QrCode: any = (function () {
  const PAD0 = 0xec;
  const PAD1 = 0x11;

  const QRMode = { MODE_8BIT_BYTE: 1 << 2 };

  const QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
  };

  function getBCHTypeInfo(data: number) {
    let d = data << 10;
    while (getBCHDigit(d) - getBCHDigit(0x537) >= 0) {
      d ^= 0x537 << (getBCHDigit(d) - getBCHDigit(0x537));
    }
    return ((data << 10) | d) ^ 0x5412;
  }

  function getBCHTypeNumber(data: number) {
    let d = data << 12;
    while (getBCHDigit(d) - getBCHDigit(0x1f25) >= 0) {
      d ^= 0x1f25 << (getBCHDigit(d) - getBCHDigit(0x1f25));
    }
    return (data << 12) | d;
  }

  function getBCHDigit(data: number) {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  function getPatternPosition(typeNumber: number) {
    return PATTERN_POSITION_TABLE[typeNumber - 1];
  }

  function getMaskFunction(maskPattern: number) {
    switch (maskPattern) {
      case QRMaskPattern.PATTERN000:
        return (i: number, j: number) => (i + j) % 2 === 0;
      case QRMaskPattern.PATTERN001:
        return (i: number) => i % 2 === 0;
      case QRMaskPattern.PATTERN010:
        return (_i: number, j: number) => j % 3 === 0;
      case QRMaskPattern.PATTERN011:
        return (i: number, j: number) => (i + j) % 3 === 0;
      case QRMaskPattern.PATTERN100:
        return (i: number, j: number) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case QRMaskPattern.PATTERN101:
        return (i: number, j: number) => ((i * j) % 2) + ((i * j) % 3) === 0;
      case QRMaskPattern.PATTERN110:
        return (i: number, j: number) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case QRMaskPattern.PATTERN111:
        return (i: number, j: number) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default:
        return (_i: number, _j: number) => false;
    }
  }

  function getErrorCorrectPolynomial(errorCorrectLength: number) {
    let a = qrPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(qrPolynomial([1, qrMath.gexp(i)], 0));
    }
    return a;
  }

  function getLengthInBits(_mode: number, type: number) {
    // Only 8bit mode needed for our use case.
    if (type >= 1 && type < 10) return 8;
    if (type < 27) return 16;
    return 16;
  }

  function qr8BitByte(data: string) {
    const parsed = utf8ToBytes(data);
    return {
      mode: QRMode.MODE_8BIT_BYTE,
      getLength: () => parsed.length,
      write: (buffer: AnyObj) => {
        for (let i = 0; i < parsed.length; i++) buffer.put(parsed[i], 8);
      },
    };
  }

  function utf8ToBytes(str: string) {
    if (typeof TextEncoder !== "undefined") return Array.from(new TextEncoder().encode(str));
    // Fallback: simplistic UTF-8 (enough for ASCII/URLs)
    const out: number[] = [];
    for (let i = 0; i < str.length; i++) out.push(str.charCodeAt(i) & 0xff);
    return out;
  }

  function qrBitBuffer() {
    const _buffer: number[] = [];
    let _length = 0;
    const putBit = (bit: boolean) => {
      const bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) _buffer.push(0);
      if (bit) _buffer[bufIndex] |= 0x80 >>> (_length % 8);
      _length++;
    };
    return {
      getBuffer: () => _buffer,
      getLengthInBits: () => _length,
      put: (num: number, length: number) => {
        for (let i = 0; i < length; i++) {
          putBit(((num >>> (length - i - 1)) & 1) === 1);
        }
      },
      putBit,
    };
  }

  const qrMath = {
    glog: (n: number) => {
      if (n < 1) throw new Error("glog");
      return LOG_TABLE[n];
    },
    gexp: (n: number) => {
      while (n < 0) n += 255;
      while (n >= 256) n -= 255;
      return EXP_TABLE[n];
    },
  };

  function qrPolynomial(num: number[], shift: number) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    const _num = new Array(num.length - offset + shift).fill(0);
    for (let i = 0; i < num.length - offset; i++) _num[i] = num[i + offset]!;
    return {
      getAt: (index: number) => _num[index]!,
      getLength: () => _num.length,
      multiply: (e: AnyObj) => {
        const out = new Array(_num.length + e.getLength() - 1).fill(0);
        for (let i = 0; i < _num.length; i++) {
          for (let j = 0; j < e.getLength(); j++) {
            out[i + j] ^= qrMath.gexp(qrMath.glog(_num[i]!) + qrMath.glog(e.getAt(j)));
          }
        }
        return qrPolynomial(out, 0);
      },
      mod: (e: AnyObj): AnyObj => {
        if (_num.length - e.getLength() < 0) return qrPolynomial(_num, 0);
        const ratio = qrMath.glog(_num[0]!) - qrMath.glog(e.getAt(0));
        const out = _num.slice();
        for (let i = 0; i < e.getLength(); i++) out[i] ^= qrMath.gexp(qrMath.glog(e.getAt(i)) + ratio);
        return qrPolynomial(out, 0).mod(e);
      },
    };
  }

  function createBytes(buffer: AnyObj, rsBlocks: AnyObj[]) {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcdata: number[][] = [];
    const ecdata: number[][] = [];

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = [];
      for (let i = 0; i < dcCount; i++) dcdata[r]![i] = 0xff & buffer.getBuffer()[i + offset]!;
      offset += dcCount;
      const rsPoly = getErrorCorrectPolynomial(ecCount);
      const rawPoly = qrPolynomial(dcdata[r]!, rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = [];
      for (let i = 0; i < ecCount; i++) {
        const modIndex = i + modPoly.getLength() - ecCount;
        ecdata[r]![i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }

    const totalCodeCount = rsBlocks.reduce((acc, b) => acc + b.totalCount, 0);
    const data: number[] = [];
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r]!.length) data.push(dcdata[r]![i]!);
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r]!.length) data.push(ecdata[r]![i]!);
      }
    }
    if (data.length !== totalCodeCount) throw new Error("createBytes");
    return data;
  }

  const QrCodeImpl: any = function (this: any, typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  };

  const proto: any = {
    addData: function (data: string) {
      this.dataList.push(qr8BitByte(data));
      this.dataCache = null;
    },
    isDark: function (row: number, col: number) {
      if (this.modules[row][col] != null) return this.modules[row][col];
      return false;
    },
    getModuleCount: function () {
      return this.moduleCount;
    },
    make: function () {
      if (this.typeNumber < 1) {
        const typeNumber = this._getBestTypeNumber();
        this.typeNumber = typeNumber;
      }
      this._makeImpl(false, this._getBestMaskPattern());
    },
    _getBestTypeNumber: function () {
      for (let typeNumber = 1; typeNumber < 41; typeNumber++) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
        const buffer = qrBitBuffer();
        for (let i = 0; i < this.dataList.length; i++) {
          const data = this.dataList[i];
          buffer.put(data.mode, 4);
          buffer.put(data.getLength(), getLengthInBits(data.mode, typeNumber));
          data.write(buffer);
        }
        const totalDataCount = rsBlocks.reduce((acc: number, b: AnyObj) => acc + b.dataCount, 0);
        if (buffer.getLengthInBits() <= totalDataCount * 8) return typeNumber;
      }
      return 40;
    },
    _makeImpl: function (_test: boolean, maskPattern: number) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (let row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount).fill(null);
      }
      this._setupPositionProbePattern(0, 0);
      this._setupPositionProbePattern(this.moduleCount - 7, 0);
      this._setupPositionProbePattern(0, this.moduleCount - 7);
      this._setupPositionAdjustPattern();
      this._setupTimingPattern();
      this._setupTypeInfo(false, maskPattern);
      if (this.typeNumber >= 7) this._setupTypeNumber(false);
      if (this.dataCache == null) this.dataCache = this._createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      this._mapData(this.dataCache, maskPattern);
    },
    _setupPositionProbePattern: function (row: number, col: number) {
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;
          if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    _setupTimingPattern: function () {
      for (let i = 8; i < this.moduleCount - 8; i++) {
        if (this.modules[i][6] == null) this.modules[i][6] = i % 2 === 0;
        if (this.modules[6][i] == null) this.modules[6][i] = i % 2 === 0;
      }
    },
    _setupPositionAdjustPattern: function () {
      const pos = getPatternPosition(this.typeNumber);
      for (let i = 0; i < pos.length; i++) {
        for (let j = 0; j < pos.length; j++) {
          const row = pos[i]!;
          const col = pos[j]!;
          if (this.modules[row][col] != null) continue;
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              this.modules[row + r][col + c] = (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
            }
          }
        }
      }
    },
    _setupTypeNumber: function (_test: boolean) {
      const bits = getBCHTypeNumber(this.typeNumber);
      for (let i = 0; i < 18; i++) {
        const mod = !((bits >> i) & 1);
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    _setupTypeInfo: function (_test: boolean, maskPattern: number) {
      const data = (this.errorCorrectLevel << 3) | maskPattern;
      const bits = getBCHTypeInfo(data);
      for (let i = 0; i < 15; i++) {
        const mod = ((bits >> i) & 1) === 1;
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
      }
      for (let i = 0; i < 15; i++) {
        const mod = ((bits >> i) & 1) === 1;
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = true;
    },
    _mapData: function (data: number[], maskPattern: number) {
      let inc = -1;
      let row = this.moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      const maskFunc = getMaskFunction(maskPattern);
      for (let col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex]! >>> bitIndex) & 1) === 1;
              const mask = maskFunc(row, col - c);
              this.modules[row][col - c] = mask ? !dark : dark;
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    },
    _createData: function (typeNumber: number, errorCorrectLevel: number, dataList: AnyObj[]) {
      const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
      const buffer = qrBitBuffer();
      for (let i = 0; i < dataList.length; i++) {
        const data = dataList[i];
        buffer.put(data.mode, 4);
        buffer.put(data.getLength(), getLengthInBits(data.mode, typeNumber));
        data.write(buffer);
      }
      const totalDataCount = rsBlocks.reduce((acc: number, b: AnyObj) => acc + b.dataCount, 0);
      if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error("overflow");
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
      while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
      while (true) {
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(PAD0, 8);
        if (buffer.getLengthInBits() >= totalDataCount * 8) break;
        buffer.put(PAD1, 8);
      }
      return createBytes(buffer, rsBlocks);
    },
    _getBestMaskPattern: function () {
      // Quick heuristic: just try patterns and pick the one with lowest penalty.
      let minLostPoint = Infinity;
      let pattern = 0;
      for (let i = 0; i < 8; i++) {
        this._makeImpl(true, i);
        const lostPoint = QRUtil.getLostPoint(this);
        if (lostPoint < minLostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    },
  };
  QrCodeImpl.prototype = proto;

  const QRUtil = {
    getLostPoint: function (qr: AnyObj) {
      const moduleCount = qr.getModuleCount();
      let lostPoint = 0;
      // Level 1
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          const dark = qr.isDark(row, col);
          let sameCount = 0;
          for (let r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (let c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qr.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += 3 + sameCount - 5;
        }
      }
      // Level 2
      for (let row = 0; row < moduleCount - 1; row++) {
        for (let col = 0; col < moduleCount - 1; col++) {
          let count = 0;
          if (qr.isDark(row, col)) count++;
          if (qr.isDark(row + 1, col)) count++;
          if (qr.isDark(row, col + 1)) count++;
          if (qr.isDark(row + 1, col + 1)) count++;
          if (count === 0 || count === 4) lostPoint += 3;
        }
      }
      // Level 3 (finder-like pattern)
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount - 6; col++) {
          if (
            qr.isDark(row, col) &&
            !qr.isDark(row, col + 1) &&
            qr.isDark(row, col + 2) &&
            qr.isDark(row, col + 3) &&
            qr.isDark(row, col + 4) &&
            !qr.isDark(row, col + 5) &&
            qr.isDark(row, col + 6)
          ) {
            lostPoint += 40;
          }
        }
      }
      for (let col = 0; col < moduleCount; col++) {
        for (let row = 0; row < moduleCount - 6; row++) {
          if (
            qr.isDark(row, col) &&
            !qr.isDark(row + 1, col) &&
            qr.isDark(row + 2, col) &&
            qr.isDark(row + 3, col) &&
            qr.isDark(row + 4, col) &&
            !qr.isDark(row + 5, col) &&
            qr.isDark(row + 6, col)
          ) {
            lostPoint += 40;
          }
        }
      }
      // Level 4 (balance)
      let darkCount = 0;
      for (let col = 0; col < moduleCount; col++) {
        for (let row = 0; row < moduleCount; row++) if (qr.isDark(row, col)) darkCount++;
      }
      const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    },
  };

  const QRRSBlock = {
    getRSBlocks: function (typeNumber: number, errorCorrectLevel: number) {
      const rsBlock = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectLevel];
      if (!rsBlock) throw new Error("rsBlock");
      const out = [];
      for (let i = 0; i < rsBlock.length / 3; i++) {
        const count = rsBlock[i * 3 + 0]!;
        const totalCount = rsBlock[i * 3 + 1]!;
        const dataCount = rsBlock[i * 3 + 2]!;
        for (let j = 0; j < count; j++) out.push({ totalCount, dataCount });
      }
      return out;
    },
  };

  // Tables (precomputed)
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
  for (let i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
  for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]!] = i;

  // Pattern position table (1..40)
  const PATTERN_POSITION_TABLE: number[][] = [
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
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ];

  // RS blocks table for versions 1..40
  // Format: [count, totalCount, dataCount] triplets.
  // This is the standard table used by qrcode-generator.
  const RS_BLOCK_TABLE: number[][] = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
  ];

  return QrCodeImpl;
})();

