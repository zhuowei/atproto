import express from 'express'
import AppContext from '../context'

export const createRouter = (ctx: AppContext): express.Router => {
  const router = express.Router()

  router.post('/forcePull/:repo/:commit', async function (req, res) {
    const {repo, commit} = req.params;
    let err:unknown = null;
    await ctx.db.transaction(async (tx) => {
      try {
        const indexingTx = ctx.services.indexing(tx);
        const { root, commit: commitObj } = await indexingTx.indexRepo(repo, commit);
        await indexingTx.indexHandle(repo, new Date().toISOString());
        await indexingTx.setCommitLastSeen(commitObj,
          {commit: root, rebase: false, tooBig: false}
        );
      } catch (e) {
        console.log(e);
        err = e;
      }
    });
    if (err) {
      res.status(400).send({});
      return;
    }
    res.send({});
  })

  router.post('/fetchProfile/:repo', async function (req, res) {
    const {repo} = req.params;
    await ctx.db.transaction(async (tx) => {
      const indexingTx = ctx.services.indexing(tx);
      await indexingTx.indexHandle(repo, new Date().toISOString());
    });
    res.send({});
  })

  return router;
}
