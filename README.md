# requester

[![Travis](https://img.shields.io/travis/gw2efficiency/requester.svg?style=flat-square)](https://travis-ci.org/gw2efficiency/requester)
[![Coveralls](https://img.shields.io/coveralls/gw2efficiency/requester/master.svg?style=flat-square)](https://coveralls.io/github/gw2efficiency/requester?branch=master)

> Single and parallel requests with retrying in a simple interface.

**NOTE: This module is still heavily in development and the API might change completely. Please don't use it yet.**

## Install

```
npm install https://github.com/gw2efficiency/requester
```

## Usage

Please note that this is a ES7 module and needs to be transpiled by [Babel](https://github.com/babel/babel).

```js
const r = require('requester')

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
```

### Options

You can pass `single` and `many` an optional `options` parameter. 
The available options with their corresponding defaults are:

```js
let options = {
  type: 'json',   // response type, can be either "json" or "text"
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
const r = require('requester')

// Retry until we get a valid answer
r.retry(() => true)

// Try to get the answer a total of three times
r.retry((tries) => tries <= 3)

// Try to get the answer a total of three times if the
// status code equals to "Internal Server Error"
r.retry((tries, err) => tries <= 3 && err.response.status === 500)
```

## Tests

```
npm test
```

## Licence

MIT
