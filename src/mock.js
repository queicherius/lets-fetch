import fetch from './index.js'
import flow from 'promise-control-flow'

let reqResponses = []
let reqOptions = []
let reqUrls = []
let mockingEnabled = true

export default {
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

export function addResponse (content) {
  reqResponses.push(content)
}

export function addResponseError (response, content) {
  const responseError = new Error('Status ' + response.status)
  responseError.response = response
  responseError.content = content

  reqResponses.push(responseError)
}

export function reset () {
  reqResponses = []
  reqOptions = []
  reqUrls = []
  fetch.retry(() => false)
}

export function urls () {
  return reqUrls
}

export function options () {
  return reqOptions
}

export function lastUrl () {
  return reqUrls[reqUrls.length - 1]
}

export function lastOption () {
  return reqOptions[reqOptions.length - 1]
}

export function enableMocking (bool) {
  mockingEnabled = bool
}

export function single (url, opt) {
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

export function many (urls, opt) {
  if (!mockingEnabled) {
    reqUrls = reqUrls.concat(urls)
    reqOptions = reqOptions.concat(opt)
    return fetch.many(urls, opt)
  }

  let requests = urls.map(url => () => single(url, opt))
  return flow.parallel(requests)
}
