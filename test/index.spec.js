/* eslint-env node, mocha */
const expect = require('chai').expect
const sinon = require('sinon')
const rewire = require('rewire')
const fetch = require('node-fetch')
const fetchMock = require('fetch-mock')

const module = rewire('../index.js')
fetchMock.useNonGlobalFetch(fetch)

beforeEach(() => {
  fetchMock.restore()
})

function mockResponses (array) {
  array.map(args => {
    fetchMock.mock.apply(fetchMock, args)
  })

  module.__set__('fetch', fetchMock.getMock())
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

    let content = await module.single('http://test.com/test', 'text')
    expect(content).to.deep.equal('<h1>Foo</h1>')
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
    ], 'text')
    expect(content).to.deep.equal([
      '<h1>Foo</h1>',
      '<h1>Foo</h1>',
      '<h1>FooBar</h1>'
    ])
  })
})

describe('error handling', () => {
  it('throws an error for if a request fails', async () => {
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

  it('throws an error for if a request of many fails', async () => {
    mockResponses([
      ['http://failing.com/no', '<h1>Foo</h1>'],
      ['http://failing.com/yes', 500]
    ])

    try {
      await module.many([
        'http://failing.com/no',
        'http://failing.com/yes'
      ], 'text')
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

  it('throws an status exception for malformed json from a bad status', async () => {
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

    let content = await module.single('http://test.com/test', 'text')
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
})
