import dotenv from 'dotenv'
import {
  IpldStore,
  MemoryBlockstore,
  PersistentBlockstore,
} from '@atproto/repo'
import * as crypto from '@atproto/crypto'
import Database from './db'
import server from './index'
import { ServerConfig } from './config'
import fs from 'fs'

const run = async () => {
  const env = process.env.ENV
  if (env) {
    dotenv.config({ path: `./.${env}.env` })
  } else {
    dotenv.config()
  }

  let blockstore: IpldStore
  let db: Database

  const cfg = ServerConfig.readEnv()

  if (cfg.blockstoreLocation) {
    blockstore = new PersistentBlockstore(cfg.blockstoreLocation)
  } else {
    blockstore = new MemoryBlockstore()
  }

  let createDbTables = false;

  if (cfg.databaseLocation) {
    createDbTables = !fs.statSync(cfg.databaseLocation, {throwIfNoEntry: false});
    db = await Database.sqlite(cfg.databaseLocation)
  } else {
    createDbTables = true;
    db = await Database.memory()
  }

  if (createDbTables) {
    await db.createTables();
  }

  const keypairPath = process.env.KEYPAIR_PATH;
  let keypair:crypto.EcdsaKeypair|null = null;
  if (keypairPath) {
    try {
      keypair = await crypto.EcdsaKeypair.import(JSON.parse(fs.readFileSync(keypairPath, {encoding: 'utf8'})));
    } catch (e) {
      console.log(e);
    }
  }
  if (!keypair) {
    keypair = await crypto.EcdsaKeypair.create({exportable: true})
    if (keypairPath) {
      fs.writeFileSync(keypairPath, JSON.stringify(await keypair!.export()), {encoding: 'utf8'});
    }
  }

  const { listener } = server(blockstore, db, keypair!, cfg)
  listener.on('listening', () => {
    console.log(`🌞 ATP Data server is running at ${cfg.origin}`)
  })
}

run()
