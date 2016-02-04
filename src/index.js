require('babel-polyfill')
const fetch = require('node-fetch')
const async = require('async')

const defaultOptions = {
  type: 'json',
  method: 'GET',
  headers: {},
  body: null
}

let retryDecider = () => false

let requestStatistics = {}
let generateStatistics = false

// Set a custom decider function that decides to retry
// based on the number of tries and the previous error
function retry (decider) {
  retryDecider = decider
}

// Toggle generating statistics
function statistics (bool) {
  generateStatistics = bool
}

// Request a single url
async function single (url, options = {}) {
  let tries = 1
  let err

  while (tries === 1 || retryDecider(tries, err)) {
    try {
      return await request(url, options)
    } catch (e) {
      err = e
      tries += 1
    }
  }

  throw err
}

// Send a request using the underlying fetch API
async function request (url, options) {
  options = {...defaultOptions, ...options}

  try {
    var response
    var content
    var decodingException

    if (!generateStatistics) {
      response = await fetch(url, options)
    } else {
      let start = new Date()
      response = await fetch(url, options)
      requestStatistics[url] = (requestStatistics[url] || []).concat(new Date() - start)
    }

    if (options.type === 'response') {
      content = response
    } else {
      try {
        content = options.type === 'json' ? await response.json() : await response.text()
      } catch (e) {
        decodingException = e
      }
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
async function many (urls, options = {}) {
  return new Promise((resolve, reject) => {
    let calls = []

    // Map over the calls and build the callbacks that async requires
    urls.map(url => {
      calls.push(async (callback) => {
        try {
          let content = await single(url, options)
          if (options.waitTime) {
            await sleep(options.waitTime)
          }
          callback(null, content)
        } catch (err) {
          callback(err)
        }
      })
    })

    // Function to resolve the promise when all calls are done
    let done = (err, results) => {
      if (err) {
        return reject(err)
      }
      resolve(results)
    }

    // Send all requests at the same time and resolve when we are done
    if (!options.waitTime) {
      async.parallel(calls, done)
      return
    }

    // We have a wait time set between each call, so we call in series
    async.series(calls, done)
  })
}

// Sleeps an amount of milliseconds
function sleep (delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

module.exports = {retry, statistics, requestStatistics, single, many}
