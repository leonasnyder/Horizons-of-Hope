import postgres from 'postgres';

let _client: ReturnType<typeof postgres> | undefined;

function getClient() {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _client = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: process.env.NODE_ENV === 'production' ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _client;
}

// Proxy defers connection until first query — safe to import during build
const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getClient() as any)(...args);
  },
  get(_target, prop: string | symbol) {
    const client = getClient();
    const val = (client as any)[prop as string];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

export default sql;
