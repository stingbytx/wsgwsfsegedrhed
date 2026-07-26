/** Generates a random, locally-unique EAN13-style numeric barcode. */
export function generateBarcodeValue(): string {
  let digits = "2"; // '2' prefix marks in-store generated codes
  for (let i = 0; i < 11; i++) digits += Math.floor(Math.random() * 10);
  // simple check digit (mod 10, standard EAN13 algorithm)
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}
