import requester from './index.js'

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
  requester.retry(() => false)
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

export async function single (url, opt) {
  reqUrls.push(url)
  reqOptions.push(opt)

  if (!mockingEnabled) {
    return await requester.single(url, opt)
  }

  return reqResponses.shift()
}

export async function many (url, opt) {
  if (!mockingEnabled) {
    reqUrls = reqUrls.concat(url)
    reqOptions = reqOptions.concat(opt)
    return await requester.many(url, opt)
  }

  let requests = []
  for (let i in url) {
    requests = requests.concat(await single(url[i], opt))
  }
  return requests
}
