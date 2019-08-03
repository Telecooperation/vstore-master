const fs = require('fs');
const lmdb_env = require('./lmdb_env');
const lmdb = require('node-lmdb');

/**** Initialize and open lmdb database ****/
const env_dir = __dirname + "/lmdb_db";
if (!fs.existsSync(env_dir)) {
    fs.mkdirSync(env_dir);
}

var env = new lmdb.Env();
env.open({
    path: __dirname + "/lmdb_db",
    mapSize: 2*1024*1024*1024,
    maxDbs: 3
});

var dbi = env.openDbi({
    name: "file_node_lookup",
    create: true // will create if database did not exist
});


exports.env = env;
exports.dbi = dbi;
