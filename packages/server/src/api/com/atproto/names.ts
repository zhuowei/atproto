import { Server } from '../../../lexicon'
import { InvalidRequestError } from '@atproto/xrpc-server'
import * as locals from '../../../locals'

export default function (server: Server) {
  server.com.atproto.resolveName(async (params, _in, _req, res) => {
    const { db, config, keypair } = locals.get(res)

    let did = ''
    if (!params.name /* || params.name === config.hostname */) {
      // self
      did = keypair.did()
    } else if (params.name.endsWith('.test') && config.testNameRegistry) {
      did = config.testNameRegistry[params.name]
    } else {
      // @TODO
      // zhuowei: hax
      const user = await db.getUser(params.name)
      if (user) {
        did = user.did;
      }
    }
    if (!did) {
      throw new InvalidRequestError(`Unable to resolve name`)
    }

    return {
      encoding: 'application/json',
      body: { did },
    }
  })
}
