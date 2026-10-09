const {
  generateQr,
  generateQrSvg,
  generateQrAscii,
} = require("../src/utils/qr");

describe("Generador de código QR para demostración local", () => {
  it("genera un código QR válido para la URL local por defecto", () => {
    const url = "http://localhost:5173/#/report";
    const qr = generateQr(url);

    expect(qr.version).toBe(3);
    expect(qr.size).toBe(29);
    expect(qr.mask).toBeGreaterThanOrEqual(0);
    expect(qr.mask).toBeLessThanOrEqual(7);
    expect(qr.matrix.length).toBe(29);
    expect(qr.matrix[0].length).toBe(29);
  });

  it("cumple con los patrones de posición (finders) estándar en las 3 esquinas", () => {
    const qr = generateQr("http://localhost:5173/#/report");
    const m = qr.matrix;
    const size = qr.size;

    function verifyFinder(r0, c0) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const val = m[r0 + r][c0 + c];
          if (r === 0 || r === 6 || c === 0 || c === 6) {
            expect(val).toBe(true);
          } else if (r === 1 || r === 5 || c === 1 || c === 5) {
            expect(val).toBe(false);
          } else {
            expect(val).toBe(true);
          }
        }
      }
    }

    verifyFinder(0, 0); // Superior izquierda
    verifyFinder(0, size - 7); // Superior derecha
    verifyFinder(size - 7, 0); // Inferior izquierda
  });

  it("cumple con los patrones de temporización y el módulo oscuro", () => {
    const qr = generateQr("http://localhost:5173/#/report");
    const m = qr.matrix;
    const size = qr.size;

    for (let i = 8; i < size - 8; i++) {
      const expected = i % 2 === 0;
      expect(m[6][i]).toBe(expected);
      expect(m[i][6]).toBe(expected);
    }

    expect(m[size - 8][8]).toBe(true);
  });

  it("genera SVG vectorial con etiquetas y atributos esperados", () => {
    const svg = generateQrSvg("http://192.168.1.100:5173/#/report", {
      sizePx: 320,
    });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 37 37"');
    expect(svg).toContain('width="320"');
    expect(svg).toContain("<rect");
    expect(svg).toContain("<path");
  });

  it("genera arte ASCII para la terminal", () => {
    const ascii = generateQrAscii("http://localhost:5173/#/report");
    expect(typeof ascii).toBe("string");
    expect(ascii).toContain("█");
    expect(ascii.split("\n").length).toBeGreaterThan(10);
  });

  it("rechaza texto vacío o excesivamente largo", () => {
    expect(() => generateQr("")).toThrow(
      "El texto a codificar en el QR no puede estar vacío",
    );
    expect(() => generateQr("a".repeat(250))).toThrow(
      "Texto demasiado largo para el generador QR local",
    );
  });
});
