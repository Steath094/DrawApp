const average = (a:number, b:number) => (a + b) / 2

export function getSvgPathFromStroke(points: number[][], closed = true) {
  const len = points.length

  if (len < 4) {
    return ``
  }

  let a = points[0]
  let b = points[1]
  const c = points[2]

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i]
    b = points[i + 1]
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `
  }

  if (closed) {
    result += 'Z'
  }

  return result
}

export function calculateRoundedCornerRadius(L_mm: number): number {

  // Step 1: Calculate the scaling factor (G)
  // Formula: G = L / 15
  const G: number = L_mm / 15;
  // Step 2: Calculate the multiplication factor (P)
  // Formula: P = 1.25 + ((G - 2) / 2) * 0.25
  const P: number = 1.25 + ((G - 2) / 2) * 0.25;
  // Step 3: Calculate the rounded corners (r)
  // Formula: r = 4 * P
  const r_mm: number = 4 * P;
  return Math.abs(r_mm);
}