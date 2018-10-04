const fetch = require('./index.js')
const flow = require('./flow.js')

let reqResponses = []
let reqOptions = []
let reqUrls = []
let mockingEnabled = true

module.exports = {
  addResponse,
  addResponseError,
  reset,
  urls,
  options,
  lastUrl,
  lastOption,
  enableMocking,
  single,
  many
}

function addResponse (content) {
  reqResponses.push(content)
}

function addResponseError (response, content) {
  const responseError = new Error('Status ' + response.status)
  responseError.response = response
  responseError.content = content

  reqResponses.push(responseError)
}

function reset () {
  reqResponses = []
  reqOptions = []
  reqUrls = []
  fetch.retry(() => false)
}

function urls () {
  return reqUrls
}

function options () {
  return reqOptions
}

function lastUrl () {
  return reqUrls[reqUrls.length - 1]
}

function lastOption () {
  return reqOptions[reqOptions.length - 1]
}

function enableMocking (bool) {
  mockingEnabled = bool
}

function single (url, opt) {
  reqUrls.push(url)
  reqOptions.push(opt)

  if (!mockingEnabled) {
    return fetch.single(url, opt)
  }

  return new Promise((resolve, reject) => {
    let response = reqResponses.shift()

    if (response instanceof Error) {
      return reject(response)
    }

    resolve(response)
  })
}

function many (urls, opt) {
  if (!mockingEnabled) {
    reqUrls = reqUrls.concat(urls)
    reqOptions = reqOptions.concat(opt)
    return fetch.many(urls, opt)
  }

  let requests = urls.map(url => () => single(url, opt))
  return flow.parallel(requests)
}
