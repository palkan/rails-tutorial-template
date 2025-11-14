import { PGLite4Rails } from "../src/database.js";

const pgDataDir = new URL("../tmp/pgdata", import.meta.url).pathname;
const pglite = new PGLite4Rails(pgDataDir);

const dbname = process.argv[2];
pglite.create_interface(dbname);
