require('babel-polyfill')
const fetch = require('isomorphic-fetch')
const async = require('gw2e-async-promises')

const defaultOptions = {
  type: 'json',
  method: 'GET',
  headers: {},
  body: null
}

let retryDecider = () => false
let retrySleep = () => false

let requestStatistics = {}
let generateStatistics = false

// Set a custom decider function that decides to retry
// based on the number of tries and the previous error
function retry (decider) {
  retryDecider = decider
}

// Set a custom function that sets how long we should
// sleep between each failed request
function retryWait (callback) {
  retrySleep = callback
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
      if (retrySleep(tries)) {
        await sleep(retrySleep(tries))
      }
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
  let asyncMethod = (options.waitTime) ? async.series : async.parallel

  // Map over the calls and convert them into promise returning functions
  let promises = urls.map(url =>
    async () => {
      let content = await single(url, options)
      if (options.waitTime) {
        await sleep(options.waitTime)
      }
      return content
    }
  )

  return asyncMethod(promises)
}

// Sleeps an amount of milliseconds
function sleep (delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

module.exports = {retry, retryWait, statistics, requestStatistics, single, many}
