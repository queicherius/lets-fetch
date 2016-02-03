const real = require('./index.js')

let responses = []
let options = []
let urls = []
let mockingEnabled = true

var mock = {
  addResponse: (response) => {
    responses.push(response)
  },
  reset: () => {
    urls = []
    responses = []
    options = []
  },
  urls: () => {
    return urls
  },
  options: () => {
    return options
  },
  lastUrl: () => {
    return urls[urls.length - 1]
  },
  lastOption: () => {
    return options[options.length - 1]
  },
  enableMocking: (bool) => {
    mockingEnabled = bool
  },
  single: async (url, opt) => {
    if (!mockingEnabled) {
      return await real.single(url, opt)
    }

    urls.push(url)
    options.push(opt)
    return responses.shift()
  },
  many: async (urls, opt) => {
    if (!mockingEnabled) {
      return await real.many(urls, opt)
    }

    let requests = []
    for (let i in urls) {
      requests = requests.concat(await mock.single(urls[i], opt))
    }
    return requests
  }
}

module.exports = mock
