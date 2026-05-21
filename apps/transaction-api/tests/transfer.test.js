const request = require('supertest');

jest.mock('../src/fraudClient');
jest.mock('../src/accountClient');

const fraudClient   = require('../src/fraudClient');
const accountClient = require('../src/accountClient');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => jest.clearAllMocks());

test('GET /health returns 200 with service name', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.service).toBe('transaction-api');
});

test('POST /transfer succeeds for normal transfer', async () => {
  fraudClient.check.mockResolvedValue({ status: 200, data: { approved: true, score: 20, reason: 'OK' } });
  accountClient.execute.mockResolvedValue({ status: 200, data: { success: true, fromBalance: 4900, toBalance: 3100 } });

  const res = await request(app)
    .post('/transfer')
    .send({ from: 'ACC001', to: 'ACC002', amount: 100 });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.correlationId).toBeDefined();
  expect(res.body.fromBalance).toBe(4900);
});

test('POST /transfer blocked by fraud returns 403', async () => {
  fraudClient.check.mockResolvedValue({ status: 403, data: { approved: false, score: 95, reason: 'Blacklisted account' } });

  const res = await request(app)
    .post('/transfer')
    .send({ from: 'ACC_BLOCKED', to: 'ACC001', amount: 100 });

  expect(res.status).toBe(403);
  expect(res.body.reason).toBe('Blacklisted account');
  expect(accountClient.execute).not.toHaveBeenCalled();
});

test('POST /transfer with insufficient funds returns 402', async () => {
  fraudClient.check.mockResolvedValue({ status: 200, data: { approved: true, score: 20, reason: 'OK' } });
  accountClient.execute.mockResolvedValue({ status: 402, data: { error: 'Insufficient funds' } });

  const res = await request(app)
    .post('/transfer')
    .send({ from: 'ACC004', to: 'ACC001', amount: 500 });

  expect(res.status).toBe(402);
});

test('POST /transfer with unknown account returns 404', async () => {
  fraudClient.check.mockResolvedValue({ status: 200, data: { approved: true, score: 20, reason: 'OK' } });
  accountClient.execute.mockResolvedValue({ status: 404, data: { error: 'Account not found' } });

  const res = await request(app)
    .post('/transfer')
    .send({ from: 'ACC999', to: 'ACC001', amount: 50 });

  expect(res.status).toBe(404);
});

test('POST /transfer when fraud service throws returns 502', async () => {
  fraudClient.check.mockRejectedValue(new Error('ECONNREFUSED'));

  const res = await request(app)
    .post('/transfer')
    .send({ from: 'ACC001', to: 'ACC002', amount: 100 });

  expect(res.status).toBe(502);
});

test('POST /transfer with missing fields returns 400', async () => {
  const res = await request(app).post('/transfer').send({ from: 'ACC001' });
  expect(res.status).toBe(400);
  expect(fraudClient.check).not.toHaveBeenCalled();
});

test('POST /transfer when account service throws returns 502', async () => {
  fraudClient.check.mockResolvedValue({ status: 200, data: { approved: true, score: 20, reason: 'OK' } });
  accountClient.execute.mockRejectedValue(new Error('ECONNREFUSED'));
  const res = await request(app).post('/transfer').send({ from: 'ACC001', to: 'ACC002', amount: 100 });
  expect(res.status).toBe(502);
});
