const fetch = require('node-fetch')
const async = require('async')

let maxTries = 3

// Set the maximum number of retries (default: 2)
function retries (tries) {
  maxTries = tries + 1
}

// Request a single url
async function single (url, type = 'json') {
  let tries = 0
  let err

  while (tries < maxTries) {
    try {
      return await request(url, type)
    } catch (e) {
      err = e
    }
    tries += 1
  }

  throw new Error(`Request failed: ${err.message}`)
}

// Send a request of a given type to a specific url
async function request (url, type) {
  let response = await fetch(url)

  if (response.status !== 200) {
    throw new Error(`Status ${response.status}`)
  }

  return type === 'json' ? await response.json() : await response.text()
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

module.exports = {retries, single, many}
