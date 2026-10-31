process.env.DATABASE_PATH = ':memory:';
process.env.AGENTS_MODE = 'regras';
process.env.UPLOAD_DIR = require('node:path').join(require('node:os').tmpdir(), 'aula-test-uploads');
