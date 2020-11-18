# lets-fetch

[![Build Status](https://img.shields.io/travis/queicherius/lets-fetch.svg?style=flat-square)](https://travis-ci.org/queicherius/lets-fetch)
[![Coverage Status](https://img.shields.io/codecov/c/github/queicherius/lets-fetch/master.svg?style=flat-square)](https://codecov.io/github/queicherius/lets-fetch) [![Greenkeeper badge](https://badges.greenkeeper.io/queicherius/lets-fetch.svg)](https://greenkeeper.io/)

> Single and parallel requests with retrying and error handling.

## Install

```
npm install lets-fetch
```

This module can be used for Node.js as well as browsers using [Browserify](https://github.com/substack/browserify-handbook#how-node_modules-works).

## Usage

```js
const fetch = require('lets-fetch')

// Async / await
async function myFunction () {
  // Get a single url
  let json = await fetch.single('http://...')
  // -> {foo: bar}
	
  // Get multiple urls
  let json = await fetch.many(['http://...', 'http://...'])
  // -> [{foo: bar}, {foobar: 1}]
	
  // Error handling
  try {
	  let json = await fetch.single('http://...')
  } catch (err) {
	  // Something went wrong :(
	  // err.response is the last response object (so you can e.g. access err.response.status)
	  // err.content is the parsed body of the response, if available
  }
}

// Promises
fetch.single('http://...')
 .then(x => console.log('content:', x))
 .catch(e => console.log('error:', e))
```

### Options

You can pass `single` and `many` an optional `options` parameter. 
The available options with their corresponding defaults are:

```js
let options = {
  // response type, can be "json", "text" or "response"
  type: 'json',
  
  // request method to use
  method: 'GET',
  
  // request headers, format {a:1} or {b:[1,2,3]}
  headers: {},
  
  // request body, can be a string or readable stream
  body: null,
  
  // wait time in between requests (only for "many")
  // as soon as this is set, requests will be sent in series instead of parallel
  waitTime: undefined,
  
  // request/response timeout in ms, 0 to disable 
  // (!) only available in node.js environments
  timeout: 0
}

await fetch.single('http://...', options)
await fetch.many(['http://...'], options)
```

### Retrying

You can set a custom function that gets the current number of tries as well as the last error object to decide if the request should be retried. By default, retrying is **disabled**.

```js
// Retry until we get a valid response
fetch.retry(() => true)

// Try to get the response a total of three times
fetch.retry((tries) => tries <= 3)

// Try to get the response a total of three times if the
// status code equals to "Internal Server Error"
fetch.retry((tries, err) => tries <= 3 && err.response.status === 500)
```

You can also set a function that defines how long the module should wait between each unsuccessful try. By default this is set to instant retries.

```js
// Don't wait between failed tries
fetch.retryWait(() => false)

// Wait a static 100ms between each failed try
fetch.retryWait(() => 100)

// Wait based on the number of failed tries
fetch.retryWait(tries => tries * 100)
```

## Logging

You can set a custom function that gets called whenever a request is finished (both success and failures).

```js
fetch.logger((info) => console.log(info))
// -> { duration: 282, retries: 0, status: 200, url: 'http://test.com/test' }
```

## Mocking

If you want to mock `lets-fetch` in your tests, you can replace it with the included basic mock module, e.g. using [rewire](https://github.com/speedskater/babel-plugin-rewire).

```js
const mock = require('lets-fetch/mock')
const myModule = require('./test.js')

// Overwrite the "fetch" variable in the module to test
myModule.__set__('fetch', mock)

// Add a response (e.g. json or a string). This is based on a "stack" system,
// every response will only get output once. "single" will output the first 
// response added, "many" will loop through multiple single calls.
// "single" and "many" will still return promises and 
// have to be handled appropriately in your tests (.then or await)
mock.addResponse({text: 'Everything fine!'})

// Add a response error (response, content)
mock.addResponseError({status: 500}, {text: 'Oh no.'})

// Enable / disable mocking. When mocking is disabled the requests
// get passed through to the real module and get send over the internet
mock.enableMocking(true)

// Reset all responses and collected requests
mock.reset()

// Get all requested urls
mock.urls()

// Get the url of the last request
mock.lastUrl()

// Get the requested options
mock.options()

// Get the options of the last request
mock.lastOptions()
```

## Tests

```
npm test
```

## Licence

MIT

---

Thanks to @pguth for the name idea. :+1:
