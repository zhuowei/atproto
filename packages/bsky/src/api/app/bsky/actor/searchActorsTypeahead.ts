import AppContext from '../../../../context'
import { Server } from '../../../../lexicon'
import { cleanTerm, getUserSearchQuery } from '../../../../services/util/search'
import { fetchProfileMaybe } from './searchActorsCommon'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.actor.searchActorsTypeahead({
    auth: ctx.authOptionalVerifier,
    handler: async ({ params, auth }) => {
      const { services, db } = ctx
      const { limit, term: rawTerm } = params
      const requester = auth.credentials.did
      const term = cleanTerm(rawTerm || '')
      if (term && term.length > 1 && term.endsWith(".bsky.social")) {
        await fetchProfileMaybe(ctx, term.startsWith("@")? term.substring(1): term);
      }

      const results = term
        ? await getUserSearchQuery(db, { term, limit })
            .selectAll('actor')
            .execute()
        : []

      return {
        encoding: 'application/json',
        body: {
          actors: await services
            .actor(db)
            .views.profileBasic(results, requester),
        },
      }
    },
  })
}
