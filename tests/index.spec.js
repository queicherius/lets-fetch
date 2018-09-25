/* eslint-env jest */
const fetch = require('../src/index.js')
const fetchMock = require('fetch-mock')

beforeEach(() => {
  fetchMock.restore()
})

function mockResponses (array) {
  array.map(args => {
    fetchMock.mock.apply(fetchMock, args)
  })

  fetch.__set__('fetch', fetchMock.fetchMock)
}

describe('requesting', () => {
  it('requests a single url as json', async () => {
    mockResponses([
      ['http://test.com/test', { id: 123 }]
    ])

    let content = await fetch.single('http://test.com/test')
    expect(content).toEqual({ id: 123 })
  })

  it('requests a single url as text', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>']
    ])

    let content = await fetch.single('http://test.com/test', { type: 'text' })
    expect(content).toEqual('<h1>Foo</h1>')
  })

  it('requests a single url as response object', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>']
    ])

    let content = await fetch.single('http://test.com/test', { type: 'response' })
    expect(content.url).toEqual('http://test.com/test')
    expect(content.status).toEqual(200)
    expect(content.headers).not.toEqual(undefined)
  })

  it('requests multiple urls as json', async () => {
    mockResponses([
      ['http://test.com/test', { id: 123 }],
      ['http://test.com/test2', { id: 456 }],
      ['http://test.com/test3', { id: 789 }]
    ])

    let content = await fetch.many([
      'http://test.com/test',
      'http://test.com/test2',
      'http://test.com/test3'
    ])
    expect(content).toEqual([{ id: 123 }, { id: 456 }, { id: 789 }])
  })

  it('requests multiple urls as text', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>'],
      ['http://test.com/test2', '<h1>Foo</h1>'],
      ['http://test.com/test3', '<h1>FooBar</h1>']
    ])

    let content = await fetch.many([
      'http://test.com/test',
      'http://test.com/test2',
      'http://test.com/test3'
    ], { type: 'text' })
    expect(content).toEqual([
      '<h1>Foo</h1>',
      '<h1>Foo</h1>',
      '<h1>FooBar</h1>'
    ])
  })

  it('requests multiple urls as response objects', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>'],
      ['http://test.com/test2', '<h1>Foo</h1>'],
      ['http://test.com/test3', '<h1>FooBar</h1>']
    ])

    let content = await fetch.many([
      'http://test.com/test',
      'http://test.com/test2',
      'http://test.com/test3'
    ], { type: 'response' })
    expect(content[0].url).toEqual('http://test.com/test')
    expect(content[0].status).toEqual(200)
    expect(content[0].headers).not.toEqual(undefined)
  })
})

describe('waiting', () => {
  it('uses parallel calls if no wait time is specified', async () => {
    mockResponses([
      ['*', () => ({ time: new Date().getTime() })]
    ])

    let timestamps = await fetch.many(['http://1.com', 'http://2.com', 'http://3.com'])

    timestamps = timestamps.map(x => x.time)
    expect(timestamps[1] - timestamps[0]).toBeLessThan(20)
    expect(timestamps[2] - timestamps[1]).toBeLessThan(20)
  })

  it('uses sequential calls and waits if a wait time is specified', async () => {
    mockResponses([
      ['*', () => ({ time: new Date().getTime() })]
    ])

    let timestamps = await fetch.many(
      ['http://1.com', 'http://2.com', 'http://3.com'],
      { waitTime: 100 }
    )

    timestamps = timestamps.map(x => x.time)
    expect(timestamps[1] - timestamps[0]).toBeGreaterThan(99)
    expect(timestamps[2] - timestamps[1]).toBeGreaterThan(99)
  })
})

describe('underlying fetch api', () => {
  it('provides "fetch" with the options', async () => {
    mockResponses([
      ['http://test.com/test', { id: 123 }]
    ])

    let content = await fetch.single('http://test.com/test')
    expect(content).toEqual({ id: 123 })
    expect(fetchMock.lastOptions()).toEqual({
      type: 'json',
      method: 'GET',
      headers: {},
      body: undefined
    })
  })

  it('can overwrite the default "fetch" options', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>']
    ])

    let options = {
      type: 'text',
      method: 'POST',
      headers: { 'Authentication': 'Test' },
      body: 'foo=bar'
    }
    let content = await fetch.single('http://test.com/test', options)
    expect(content).toEqual('<h1>Foo</h1>')
    expect(fetchMock.lastOptions()).toEqual(options)
  })
})

describe('error handling', () => {
  it('throws an error if a request fails', async () => {
    mockResponses([
      ['http://failing.com/yes', 500]
    ])

    try {
      await fetch.single('http://failing.com/yes')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
  })

  it('throws an error if a request fails even when we get the response object', async () => {
    mockResponses([
      ['http://failing.com/yes', 500]
    ])

    try {
      await fetch.single('http://failing.com/yes', { type: 'response' })
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
  })

  it('throws an error if a request of many fails', async () => {
    mockResponses([
      ['http://failing.com/no', '<h1>Foo</h1>'],
      ['http://failing.com/yes', 500]
    ])

    try {
      await fetch.many([
        'http://failing.com/no',
        'http://failing.com/yes'
      ], { type: 'text' })
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
  })

  it('throws an decoding exception for malformed json', async () => {
    mockResponses([
      ['http://failing.com/malformed', '{"test: "malformed"}']
    ])

    try {
      await fetch.single('http://failing.com/malformed')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
    expect(err.message).toEqual(expect.stringContaining('Unexpected token'))
  })

  it('always throws an status exception from a bad status', async () => {
    mockResponses([
      ['http://failing.com/malformed', { status: 500, body: 'Error message which is not JSON' }]
    ])

    try {
      await fetch.single('http://failing.com/malformed')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
    expect(err.message).toEqual('Status 500')
  })

  it('throws an error that includes the response and the content', async () => {
    mockResponses([
      ['http://failing.com/erroring', { status: 403, body: '{"text": "authentication required"}' }]
    ])

    try {
      await fetch.single('http://failing.com/erroring')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
    expect(typeof err.response).toEqual('object')
    expect(err.message).toEqual('Status 403')
    expect(err.response.status).toEqual(403)
    expect(err.content).toEqual({ text: 'authentication required' })
  })
})

describe('retrying', () => {
  it('retries on error till success', async () => {
    fetch.retry(() => true)

    mockResponses([
      ['http://test.com/test', 500, { times: 3 }],
      ['http://test.com/test', 'text', { times: 1 }],
      ['http://test.com/test', 'not text']
    ])

    let content = await fetch.single('http://test.com/test', { type: 'text' })
    expect(content).toEqual('text')
  })

  it('respects the decider response', async () => {
    fetch.retry((tries) => tries <= 3)

    mockResponses([
      ['http://test.com/test', 500, { times: 3 }],
      ['http://test.com/test', 'text', { times: 1 }],
      ['http://test.com/test', 'not text']
    ])

    try {
      await fetch.single('http://test.com/test')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
  })

  it('can disable retrying', async () => {
    fetch.retry(() => false)

    mockResponses([
      ['http://test.com/test', 500, { times: 1 }],
      ['http://test.com/test', 'text', { times: 1 }],
      ['http://test.com/test', 'not text']
    ])

    try {
      await fetch.single('http://test.com/test')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)
  })

  it('can access the error object and the retries in the retry decider', async () => {
    let callbackMock = jest.fn()
    fetch.retry(callbackMock)

    mockResponses([
      ['http://test.com/test', 500, { times: 1 }],
      ['http://test.com/test', 'text', { times: 1 }],
      ['http://test.com/test', 'not text']
    ])

    try {
      await fetch.single('http://test.com/test')
    } catch (e) {
      var err = e
    }

    expect(err).toBeInstanceOf(Error)

    let deciderArguments = callbackMock.mock.calls[0]
    expect(deciderArguments[0]).toEqual(2)
    expect(deciderArguments[1]).toBeInstanceOf(Error)
    expect(deciderArguments[1].response).not.toEqual(undefined)
    expect(deciderArguments[1].response.status).toEqual(500)
  })

  it('can specify a wait function for retrying', async () => {
    fetch.retry(() => true)
    fetch.retryWait(tries => tries * 100)

    mockResponses([
      ['http://test.com/test', 500, { times: 4 }],
      ['http://test.com/test', 'text', { times: 1 }],
      ['http://test.com/test', 'not text']
    ])

    let start = new Date()
    await fetch.single('http://test.com/test', { type: 'text' })
    expect(new Date() - start).toBeGreaterThan(99 * (1 + 2 + 3 + 4))
  })
})
