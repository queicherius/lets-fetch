const fetch = require('cross-fetch')
const flow = require('./flow.js')

const defaultOptions = {
  type: 'json',
  method: 'GET',
  headers: {},
  body: undefined
}

let internalRetry = () => false
let internalRetryWait = () => false

// istanbul ignore next
let internalLogger = () => false

module.exports = { retry, retryWait, logger, single, many }

// Set a custom decider function that decides to retry
// based on the number of tries and the previous error
function retry (decider) {
  internalRetry = decider
}

// Set a custom function that sets how long we should
// sleep between each failed request
function retryWait (callback) {
  internalRetryWait = callback
}

// Set a custom function that logs out information about each request
function logger (callback) {
  internalLogger = callback
}

// Request a single url
function single (url, options = {}) {
  let tries = 1

  // Execute the request and retry if there are errors (and the
  // retry decider decided that we should try our luck again)
  const callRequest = () => {
    let start = new Date()

    return request(url, options)
      .then((data) => {
        internalLogger({ url, duration: new Date() - start, status: 200, retries: tries - 1 })

        return data
      })
      .catch(err => {
        internalLogger({ url, duration: new Date() - start, status: err.response.status, retries: tries - 1 })

        if (internalRetry(++tries, err)) {
          return wait(callRequest, internalRetryWait(tries))
        }

        throw err
      })
  }

  return callRequest()
}

// Send a request using the underlying fetch API
function request (url, options) {
  options = Object.assign({}, defaultOptions, options)
  let savedContent
  let savedResponse

  return new Promise((resolve, reject) => {
    fetch(url, options)
      .then(handleResponse)
      .then(handleBody)
      .catch(handleError)

    function handleResponse (response) {
      // Save the response for checking the status later
      savedResponse = response

      // Decode the response body
      switch (options.type) {
        case 'response':
          return response
        case 'json':
          return response.json()
        default:
          return response.text()
      }
    }

    function handleBody (content) {
      // Bubble an error if the response status is not okay
      if (savedResponse && savedResponse.status >= 400) {
        savedContent = content
        throw new Error(`Response status indicates error`)
      }

      // All is well!
      resolve(content)
    }

    function handleError (err) {
      // Overwrite potential decoding errors when the actual problem was the response
      if (savedResponse && savedResponse.status >= 400) {
        err = new Error(`Status ${savedResponse.status}`)
      }

      // Enrich the error message with the response and the content
      let error = new Error(err.message)
      error.response = savedResponse
      error.content = savedContent
      reject(error)
    }
  })
}

// Request multiple pages
function many (urls, options = {}) {
  let flowMethod = (options.waitTime) ? flow.series : flow.parallel

  // Call the single method while respecting the wait time in between tasks
  const callSingle = (url) => single(url, options)
    .then(content => wait(() => content, options.waitTime))

  // Map over the urls and call them using the method the user chose
  let promises = urls.map(url => () => callSingle(url))
  return flowMethod(promises)
}

// Wait a specific time before executing a callback
function wait (callback, ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(callback()), ms || 0)
  })
}
