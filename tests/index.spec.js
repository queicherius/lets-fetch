/* eslint-env node, mocha */
import {expect} from 'chai'
import sinon from 'sinon'
import fetchMock from 'fetch-mock'
import module from '../src/index.js'

beforeEach(() => {
  fetchMock.restore()
})

function mockResponses (array) {
  array.map(args => {
    fetchMock.mock.apply(fetchMock, args)
  })

  module.__set__('fetch', fetchMock.fetchMock)
}

describe('requesting', () => {
  it('requests a single url as json', async () => {
    mockResponses([
      ['http://test.com/test', {id: 123}]
    ])

    let content = await module.single('http://test.com/test')
    expect(content).to.deep.equal({id: 123})
  })

  it('requests a single url as text', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>']
    ])

    let content = await module.single('http://test.com/test', {type: 'text'})
    expect(content).to.deep.equal('<h1>Foo</h1>')
  })

  it('requests a single url as response object', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>']
    ])

    let content = await module.single('http://test.com/test', {type: 'response'})
    expect(content.url).to.equal('http://test.com/test')
    expect(content.status).to.equal(200)
    expect(content.headers).to.exist
  })

  it('requests multiple urls as json', async () => {
    mockResponses([
      ['http://test.com/test', {id: 123}],
      ['http://test.com/test2', {id: 456}],
      ['http://test.com/test3', {id: 789}]
    ])

    let content = await module.many([
      'http://test.com/test',
      'http://test.com/test2',
      'http://test.com/test3'
    ])
    expect(content).to.deep.equal([{id: 123}, {id: 456}, {id: 789}])
  })

  it('requests multiple urls as text', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>'],
      ['http://test.com/test2', '<h1>Foo</h1>'],
      ['http://test.com/test3', '<h1>FooBar</h1>']
    ])

    let content = await module.many([
      'http://test.com/test',
      'http://test.com/test2',
      'http://test.com/test3'
    ], {type: 'text'})
    expect(content).to.deep.equal([
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

    let content = await module.many([
      'http://test.com/test',
      'http://test.com/test2',
      'http://test.com/test3'
    ], {type: 'response'})
    expect(content[0].url).to.equal('http://test.com/test')
    expect(content[0].status).to.equal(200)
    expect(content[0].headers).to.exist
  })
})

describe('waiting', () => {
  it('waits when using the sleep method', async () => {
    let start = new Date()
    await module.__get__('sleep')(100)
    expect(new Date() - start).to.be.above(99)
  })

  it('uses parallel calls if no wait time is specified', async () => {
    mockResponses([
      ['^http', () => ({time: new Date().getTime()})]
    ])

    let timestamps = await module.many(['http://1.com', 'http://2.com', 'http://3.com'])

    timestamps = timestamps.map(x => x.time)
    expect(timestamps[1] - timestamps[0]).to.be.below(20)
    expect(timestamps[2] - timestamps[1]).to.be.below(20)
  })

  it('uses sequential calls and waits if a wait time is specified', async () => {
    mockResponses([
      ['^http', () => ({time: new Date().getTime()})]
    ])

    let timestamps = await module.many(
      ['http://1.com', 'http://2.com', 'http://3.com'],
      {waitTime: 100}
    )

    timestamps = timestamps.map(x => x.time)
    expect(timestamps[1] - timestamps[0]).to.be.above(99)
    expect(timestamps[2] - timestamps[1]).to.be.above(99)
  })
})

describe('underlying fetch api', () => {
  it('provides "fetch" with the options', async () => {
    mockResponses([
      ['http://test.com/test', {id: 123}]
    ])

    let content = await module.single('http://test.com/test')
    expect(content).to.deep.equal({id: 123})
    expect(fetchMock.lastOptions()).to.deep.equal({
      type: 'json',
      method: 'GET',
      headers: {},
      body: null
    })
  })

  it('can overwrite the default "fetch" options', async () => {
    mockResponses([
      ['http://test.com/test', '<h1>Foo</h1>']
    ])

    let options = {
      type: 'text',
      method: 'POST',
      headers: {'Authentication': 'Test'},
      body: 'foo=bar'
    }
    let content = await module.single('http://test.com/test', options)
    expect(content).to.deep.equal('<h1>Foo</h1>')
    expect(fetchMock.lastOptions()).to.deep.equal(options)
  })
})

describe('error handling', () => {
  it('throws an error if a request fails', async () => {
    mockResponses([
      ['http://failing.com/yes', 500]
    ])

    try {
      await module.single('http://failing.com/yes')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
  })

  it('throws an error if a request fails even when we get the response object', async () => {
    mockResponses([
      ['http://failing.com/yes', 500]
    ])

    try {
      await module.single('http://failing.com/yes', {type: 'response'})
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
  })

  it('throws an error if a request of many fails', async () => {
    mockResponses([
      ['http://failing.com/no', '<h1>Foo</h1>'],
      ['http://failing.com/yes', 500]
    ])

    try {
      await module.many([
        'http://failing.com/no',
        'http://failing.com/yes'
      ], {type: 'text'})
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
  })

  it('throws an decoding exception for malformed json', async () => {
    mockResponses([
      ['http://failing.com/malformed', '{"test: "malformed"}']
    ])

    try {
      await module.single('http://failing.com/malformed')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
    expect(err.message).to.contain('Unexpected token')
  })

  it('always throws an status exception from a bad status', async () => {
    mockResponses([
      ['http://failing.com/malformed', {status: 500, body: 'Error message which is not JSON'}]
    ])

    try {
      await module.single('http://failing.com/malformed')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
    expect(err.message).to.equal('Status 500')
  })

  it('throws an error that includes the response and the content', async () => {
    mockResponses([
      ['http://failing.com/erroring', {status: 403, body: '{"text": "authentication required"}'}]
    ])

    try {
      await module.single('http://failing.com/erroring')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
    expect(err.response).to.be.an.object
    expect(err.message).to.equal('Status 403')
    expect(err.response.status).to.equal(403)
    expect(err.content).to.deep.equal({text: 'authentication required'})
  })
})

describe('retrying', () => {
  it('retries on error till success', async () => {
    module.retry(() => true)
    let tries = 0

    mockResponses([
      ['http://test.com/test', function () {
        tries++
        if (tries === 4) {
          return 'text'
        }
        return 500
      }]
    ])

    let content = await module.single('http://test.com/test', {type: 'text'})
    expect(content).to.deep.equal('text')
    expect(tries).to.equal(4)
  })

  it('respects the decider response', async () => {
    module.retry((tries) => tries <= 3)
    let tries = 0

    mockResponses([
      ['http://test.com/test', function () {
        tries++
        if (tries === 3) {
          return 'text'
        }
        return 500
      }]
    ])

    try {
      await module.single('http://test.com/test')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
    expect(tries).to.equal(3)
  })

  it('can disable retrying', async () => {
    module.retry(() => false)
    let tries = 0

    mockResponses([
      ['http://test.com/test', function () {
        tries++
        if (tries === 2) {
          return 'text'
        }
        return 500
      }]
    ])

    try {
      await module.single('http://test.com/test')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
    expect(tries).to.equal(1)
  })

  it('can access the error object and the retries in the retry decider', async () => {
    let callback = sinon.spy()
    module.retry(callback)
    let tries = 0

    mockResponses([
      ['http://test.com/test', function () {
        tries++
        if (tries === 2) {
          return 'text'
        }
        return 500
      }]
    ])

    try {
      await module.single('http://test.com/test')
    } catch (e) {
      var err = e
    }

    expect(err).to.exist.and.be.instanceof(Error)
    expect(tries).to.equal(1)

    let deciderArguments = callback.args[0]
    expect(deciderArguments[0]).to.equal(2)
    expect(deciderArguments[1]).to.exist.and.be.instanceof(Error)
    expect(deciderArguments[1].response).to.exist
    expect(deciderArguments[1].response.status).to.equal(500)
  })

  it('can specify a wait function for retrying', async () => {
    module.retry(() => true)
    module.retryWait(tries => tries * 100)
    let tries = 0

    mockResponses([
      ['^http', function () {
        tries++
        if (tries === 4) {
          return 'text'
        }
        return 500
      }]
    ])

    let start = new Date()
    await module.single('http://test.com/test', {type: 'text'})
    expect(tries).to.equal(4)
    expect(new Date() - start).to.be.above(99 + 200 + 300)
  })
})
