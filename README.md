# requester

[![Travis](https://img.shields.io/travis/gw2efficiency/requester.svg?style=flat-square)](https://travis-ci.org/gw2efficiency/requester)
[![Coveralls](https://img.shields.io/coveralls/gw2efficiency/requester/master.svg?style=flat-square)](https://coveralls.io/github/gw2efficiency/requester?branch=master)

> Single and parallel requests with retrying in a simple interface.

**:bomb: NOTE: This module is still heavily in development and the API might change completely. Please don't use it yet.**

## Install

```
npm install https://github.com/gw2efficiency/requester
```

This module can be used for Node.js as well as browsers using [Browserify](https://github.com/substack/browserify-handbook#how-node_modules-works).

(Note: Babel gets pulled in as a dependency, because the module is written in ES7 and 
gets compiled into ES5 during the installation. The Babel code is **not** included in the module, 
don't be shocked at the dependency tree. :wink:)

## Usage

```js
const r = require('requester')

// ES7
async function myFunction () {
  // Get a single url
  let json = await r.single('http://...')
  // -> {foo: bar}
	
  // Get multiple urls
  let json = await r.many(['http://...', 'http://...'])
  // -> [{foo: bar}, {foobar: 1}]
	
  // Error handling
  try {
	let json = await r.single('http://...')
  } catch (err) {
	// Something went wrong :(
	// err.response is the last response object (e.g. err.response.status)
	// err.content is the parsed body of the response, if available
  }
}

// Promises
r.single('http://...')
 .then(x => console.log('content:', x))
 .catch(e => console.log('error:', e))
```

### Options

You can pass `single` and `many` an optional `options` parameter. 
The available options with their corresponding defaults are:

```js
let options = {
  type: 'json',   // response type, can be "json", "text" or "response" (response object)
  method: 'GET',  // request method to use
  headers: {},    // request headers, format {a:1} or {b:[1,2,3]}
  body: null      // request body, can be a string or readable stream
}

await r.single('http://...', options)
```

### Retry decider

You can set a custom function that gets the current number of tries as well as
the last error object to decide if the request should be retried. With the default settings,
retrying is **disabled**.

```js
// Retry until we get a valid answer
r.retry(() => true)

// Try to get the answer a total of three times
r.retry((tries) => tries <= 3)

// Try to get the answer a total of three times if the
// status code equals to "Internal Server Error"
r.retry((tries, err) => tries <= 3 && err.response.status === 500)
```

### Request statistics

You can easily enable statistics about the hit urls, amount of requests and request times in milliseconds.

```js
r.statistics(true)

// Execute some requests
await r.single('http://url.com')
await r.single('http://url.com')
await r.single('http://url.com')

// Holds all requested urls as keys and an array
// of milliseconds that correspond to each request
console.log(r.requestStatistics)
// -> {'http://url.com': [ 11, 444, 11 ], /* ... */}
```

## Mocking

If you want to mock requester in your tests, you can replace it with
the included mock module, e.g. using [rewire](https://github.com/jhnns/rewire) (or write your own!).

```js
let rewire = require('rewire')
let requesterMock = require('requester/mock')
let testingModule = rewire('./test.js')

testingModule.__set__('requester', requesterMock)

// Add a response (e.g. json or a string). This is based on a "stack" system,
// every response will only get output once. "single" will output the first 
// response added, "many" will loop through multiple single calls.
// "single" and "many" will still return promises and 
// have to be handled appropriately in your tests (.then/.catch or await)
requesterMock.addResponse({text: 'Everything fine!'})

// Enable / disable mocking. When mocking is disabled the requests
// get passed through to the real module and get send over the internet
requesterMock.enableMocking(true)

// Reset all responses and collected requests
requesterMock.reset()

// Get all requested urls
requesterMock.urls()

// Get the url of the last request
requesterMock.lastUrl()

// Get the requested options
requesterMock.options()

// Get the options of the last request
requesterMock.lastOptions()
``

## Tests

```
npm test
```

## Licence

MIT
