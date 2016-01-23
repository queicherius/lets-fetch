const fetch = require('node-fetch')
const async = require('async')

// Request a single page
async function single (url, type = 'json') {
  try {
    let response = await fetch(url)

    if (response.status !== 200) {
      throw new Error(`Status ${response.status}`)
    }

    return type === 'json'
      ? await response.json()
      : await response.text()
  } catch (e) {
    throw new Error(`Request failed: ${e.message}`)
  }
}

// Request multiple pages
async function many (urls, type = 'json') {
  return new Promise((resolve, reject) => {
    let calls = []

    // Map over the calls and build around the callbacks
    // that "async.parallel" requires
    urls.map(url => {
      calls.push(async (callback) => {
        try {
          let content = await single(url, type)
          callback(null, content)
        } catch (err) {
          callback(err)
        }
      })
    })

    // Send all requests at the same time and resolve when we are done
    async.parallel(calls, (err, results) => {
      if (err) {
        reject(err)
        return
      }

      resolve(results)
    })
  })
}

module.exports = {single, many}
