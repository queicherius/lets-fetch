/* eslint-env node, mocha */
import {expect} from 'chai'
import module from '../src/mock.js'

module.__set__('fetch', {
  single: async () => 'Some Content',
  many: async () => ['Some Content'],
  retry: (cb) => cb()
})

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
    module.reset()
    module.addResponse({foo: 'bar'})
    module.enableMocking(false)

    let content = await module.single('real/single/url')
    expect(content).to.deep.equal('Some Content')
    expect(module.lastUrl()).to.equal('real/single/url')
  })

  it('can enable the real module (many)', async () => {
    module.reset()
    module.addResponse({foo: 'bar'})
    module.enableMocking(false)

    let content = await module.many('real/many/url')
    expect(content).to.deep.equal(['Some Content'])
    expect(module.lastUrl()).to.equal('real/many/url')
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
