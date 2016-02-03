/* eslint-env node, mocha */
const expect = require('chai').expect
const module = require('../src/mock.js')

describe('mock', () => {
  it('can add a response', async () => {
    module.addResponse({foo: 'bar'})
    expect(await module.single('some/url')).to.deep.equal({foo: 'bar'})
  })

  it('can add multiple responses', async () => {
    module.addResponse({foo: 'bar'})
    module.addResponse('string')
    expect(await module.single('some/url')).to.deep.equal({foo: 'bar'})
    expect(await module.single('some/url')).to.deep.equal('string')
  })

  it('can use "many" for multiple responses', async () => {
    module.addResponse({foo: 'bar'})
    module.addResponse('string')
    let x = await module.many(['some/url', 'some/url'])
    expect(x).to.deep.equal([{foo: 'bar'}, 'string'])
  })

  it('can reset and get the request urls', async () => {
    module.reset()
    module.addResponse({foo: 'bar'})

    await module.single('some/url')
    expect(module.urls()).to.deep.equal(['some/url'])
    expect(module.lastUrl()).to.equal('some/url')
  })

  it('can reset and get the request options', async () => {
    module.reset()
    module.addResponse({foo: 'bar'})
    let options = {type: 'text', headers: {Authenticate: 'Token'}}

    await module.single('some/url', options)
    expect(module.options()).to.deep.equal([options])
    expect(module.lastOption()).to.equal(options)
  })

  it('can reset the responses', async () => {
    module.addResponse({foo: 'bar'})
    module.reset()

    let x = await module.single('some/url')
    expect(x).to.equal(undefined)
  })

  it('can enable the real module (single)', async () => {
    let err
    module.reset()
    module.addResponse({foo: 'bar'})
    module.enableMocking(false)

    try {
      await module.single('some/url')
    } catch (e) {
      err = e
    }

    expect(err).to.exist
    expect(err).to.instanceOf(Error)
  })

  it('can enable the real module (many)', async () => {
    let err
    module.reset()
    module.addResponse({foo: 'bar'})
    module.enableMocking(false)

    try {
      await module.many(['some/url'])
    } catch (e) {
      err = e
    }

    expect(err).to.exist
    expect(err).to.instanceOf(Error)
  })

  it('can disable the real module again', async () => {
    module.reset()
    module.enableMocking(false)
    module.addResponse({foo: 'bar'})
    module.enableMocking(true)

    let x = await module.single('some/url')
    expect(x).to.deep.equal({foo: 'bar'})
  })
})
