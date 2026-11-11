// One-shot check processes share disk caches. No watcher or worker stays
// alive after the command. node_modules is excluded from source and checkpoints.
const { mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { enableCompileCache } = require('node:module');

const root = join(__dirname, '..', 'node_modules', '.cache');
const temporary = join(root, 'tmp');
mkdirSync(temporary, { recursive: true });
// tsx uses os.tmpdir() for its transform cache. Use the project's disk instead
// of relying on /tmp's mount/cleanup policy (template build steps use tmpfs).
process.env.TMPDIR = temporary;
process.env.TMP = temporary;
process.env.TEMP = temporary;
process.env.NODE_COMPILE_CACHE ??= join(root, 'node');
enableCompileCache(process.env.NODE_COMPILE_CACHE);
