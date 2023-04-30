import { sql } from 'kysely'
import AppContext from '../../../../context'
import { Server } from '../../../../lexicon'
import {
  cleanTerm,
  getUserSearchQuery,
  SearchKeyset,
} from '../../../../services/util/search'
import { resolveExternalHandle } from '../../../../util/identity'

async function fetchProfileMaybe(ctx: AppContext, handle: string) {
  const resolved = await resolveExternalHandle(handle);
  if (!resolved) {
    return;
  }
  await ctx.db.transaction(async (tx) => {
    const indexingTx = ctx.services.indexing(tx);
    await indexingTx.indexHandle(resolved, new Date().toISOString());
  });
}

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.actor.searchActors({
    auth: ctx.authOptionalVerifier,
    handler: async ({ auth, params }) => {
      const { services, db } = ctx
      const { cursor, limit, term: rawTerm } = params
      const requester = auth.credentials.did
      const term = cleanTerm(rawTerm || '')

      // TODO(zhuowei): hack
      if (term.length > 0 && term.charAt(0) == "@" && term.indexOf(" ") === -1) {
        console.log("fetching profile on search");
        await fetchProfileMaybe(ctx, term.substring(1));
      }

      const results = term
        ? await getUserSearchQuery(db, { term, limit, cursor })
            .select('distance')
            .selectAll('actor')
            .execute()
        : []
      const keyset = new SearchKeyset(sql``, sql``)

      return {
        encoding: 'application/json',
        body: {
          cursor: keyset.packFromResult(results),
          actors: await services.actor(db).views.profile(results, requester),
        },
      }
    },
  })
}
