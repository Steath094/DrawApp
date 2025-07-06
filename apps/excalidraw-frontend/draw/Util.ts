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


export function addInput(x:number, y:number,hasInput:boolean) {

    var input = document.createElement('input');

    input.type = 'text';
    input.style.position = 'fixed';
    input.style.left = (x - 4) + 'px';
    input.style.top = (y - 4) + 'px';
    input.style.color= "white"
    input.style.padding= "4px"
    // input.onkeydown = handleEnter;

    document.body.appendChild(input);

    input.focus();

    hasInput = true;
}
// function handleEnter(e) {
//     var keyCode = e.keyCode;
//     if (keyCode === 13) {
//         drawText(this.value, parseInt(this.style.left, 10), parseInt(this.style.top, 10));
//         document.body.removeChild(this);
//         hasInput = false;
//     }
// }