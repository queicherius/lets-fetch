const fetch = require('node-fetch')
const async = require('async')

let retryDecider = () => false

// Set a custom decider function that decides to retry
// based on the number of tries and the previous error
function retry (decider) {
  retryDecider = decider
}

// Request a single url
async function single (url, type = 'json') {
  let tries = 0
  let err

  while (tries === 0 || retryDecider(tries, err)) {
    try {
      return await request(url, type)
    } catch (e) {
      err = e
      tries += 1
    }
  }

  throw err
}

// Send a request of a given type to a specific url
async function request (url, type) {
  try {
    var response = await fetch(url)
    var decodingException

    try {
      var content = type === 'json'
        ? await response.json()
        : await response.text()
    } catch (e) {
      decodingException = e
    }

    if (response.status >= 400) {
      throw new Error(`Status ${response.status}`)
    }

    if (decodingException) {
      throw decodingException
    }

    return content
  } catch (err) {
    let error = new Error(err.message)
    error.response = response
    error.content = content
    throw error
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

module.exports = {retry, single, many}
