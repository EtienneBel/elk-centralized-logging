const request = require('supertest');

jest.mock('../src/authClient');
const authClient = require('../src/authClient');

let app;
beforeAll(() => { app = require('../src/app'); });
afterAll(() => jest.clearAllMocks());

test('GET /health returns 200 with service name', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.service).toBe('notification-api');
});

test('POST /notify?fail=true returns 500 without calling auth', async () => {
  const res = await request(app).post('/notify?fail=true').send({ userId: 'alice' });
  expect(res.status).toBe(500);
  expect(authClient.validate).not.toHaveBeenCalled();
});

test('POST /notify with successful auth returns 200', async () => {
  authClient.validate.mockResolvedValue({ ok: true, status: 200, data: { billing: 'active' } });
  const res = await request(app).post('/notify').send({ userId: 'alice' });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.correlationId).toBeDefined();
});

test('POST /notify when auth rejects returns 502', async () => {
  authClient.validate.mockResolvedValue({ ok: false, status: 403, data: {} });
  const res = await request(app).post('/notify').send({ userId: 'banned' });
  expect(res.status).toBe(502);
});

test('POST /notify when auth throws returns 502', async () => {
  authClient.validate.mockRejectedValue(new Error('ECONNREFUSED'));
  const res = await request(app).post('/notify').send({ userId: 'alice' });
  expect(res.status).toBe(502);
});
