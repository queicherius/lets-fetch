async function series (array) {
  let results = []

  for (let i = 0; i !== array.length; i++) {
    results.push(await array[i]())
  }

  return results
}

function parallel (array) {
  return Promise.all(array.map(func => func()))
}

module.exports = {
  series,
  parallel
}
