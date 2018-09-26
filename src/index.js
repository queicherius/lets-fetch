const fetch = require('node-fetch')
const flow = require('promise-control-flow')

const defaultOptions = {
  type: 'json',
  method: 'GET',
  headers: {},
  body: undefined
}

let internalRetry = () => false
let internalRetryWait = () => false

module.exports = { retry, retryWait, single, many }

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

// Request a single url
function single (url, options = {}) {
  let tries = 1

  // Execute the request and retry if there are errors (and the
  // retry decider decided that we should try our luck again)
  const callRequest = () => request(url, options).catch(err => {
    if (internalRetry(++tries, err)) {
      return wait(callRequest, internalRetryWait(tries))
    }

    throw err
  })

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
    if (!ms) {
      return resolve(callback())
    }

    setTimeout(() => resolve(callback()), ms)
  })
}
