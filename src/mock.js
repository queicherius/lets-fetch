import fetch from './index.js'
import flow from 'promise-flowcontrol'

let reqResponses = []
let reqOptions = []
let reqUrls = []
let mockingEnabled = true

export default {
  addResponse,
  reset,
  urls,
  options,
  lastUrl,
  lastOption,
  enableMocking,
  single,
  many
}

export function addResponse (response) {
  reqResponses.push(response)
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

  return new Promise((resolve) => {
    resolve(reqResponses.shift())
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
