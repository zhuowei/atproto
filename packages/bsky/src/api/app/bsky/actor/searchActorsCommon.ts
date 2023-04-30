import AppContext from '../../../../context'
import { resolveExternalHandle } from '../../../../util/identity'

export async function fetchProfileMaybe(ctx: AppContext, handle: string) {
    const resolved = await resolveExternalHandle(handle);
    if (!resolved) {
      return;
    }
    await ctx.db.transaction(async (tx) => {
      const indexingTx = ctx.services.indexing(tx);
      await indexingTx.indexHandle(resolved, new Date().toISOString());
    });
  }