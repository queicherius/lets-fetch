# requester

[![Travis](https://img.shields.io/travis/gw2efficiency/requester.svg?style=flat-square)](https://travis-ci.org/gw2efficiency/requester)
[![Coveralls](https://img.shields.io/coveralls/gw2efficiency/requester/master.svg?style=flat-square)](https://coveralls.io/github/gw2efficiency/requester?branch=master)

> Single and parallel requests with automatic retrying in a simple interface.

**NOTE: This module is still heavily in development and the API might change completely. Please don't use it yet.**

## Install

```
npm install https://github.com/gw2efficiency/requester
```

## Usage

Please note that this is a ES7 module, and needs to be transpiled by [Babel](https://github.com/babel/babel).

```js
const r = require('requester')

// Set how many times failing requests
// should be retried (default: 2)
r.retries(2)

async function myFunction () {
  // Get a single url as json
  let json = await r.single('http://...')
  // -> {foo: bar}
	
  // Get a single url as text
  let html = await r.single('http://...', 'text')
  // -> '<h1>html</h1>'
	
  // Get multiple urls as json
  let json = await r.many(['http://...', 'http://...'])
  // -> [{foo: bar}, {foobar: 1}]
	
  // Get multiple urls as text
  let json = await r.many(['http://...', 'http://...'], 'text')
  // -> ['<h1>html</h1>', 'Maybe plain text']
	
  // Error handling
  try {
	let json = await r.single('http://...')
  } catch (e) {
	// Something went wrong :(
  }
}

```

## Tests

```
npm test
```

## Licence

MIT
