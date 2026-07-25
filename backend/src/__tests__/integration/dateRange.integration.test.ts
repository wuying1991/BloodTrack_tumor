import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { BloodTest } from '../../models/BloodTest';
import { BiochemTest } from '../../models/BiochemTest';
import { ChemoCycle } from '../../models/ChemoCycle';
import { Reminder } from '../../models/Reminder';

let mongoServer: MongoMemoryServer;
let token: string;
let userId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const registered = await request(app).post('/api/auth/register').send({
    email: 'date-range@example.com',
    password: 'Test1234!',
    fullName: 'Date Range Tester',
  });
  token = registered.body.data.accessToken;
  userId = registered.body.data._id;

  await Promise.all([
    BloodTest.create({
      user: userId,
      date: new Date('2026-06-30T12:00:00.000Z'),
      wbc: 5,
      rbc: 4.5,
      hgb: 130,
      plt: 180,
    }),
    BloodTest.create({
      user: userId,
      date: new Date('2026-07-15T12:00:00.000Z'),
      wbc: 5,
      rbc: 4.5,
      hgb: 130,
      plt: 180,
    }),
    BiochemTest.create({ user: userId, date: new Date('2026-06-20T12:00:00.000Z') }),
    BiochemTest.create({ user: userId, date: new Date('2026-07-20T12:00:00.000Z') }),
    ChemoCycle.create({
      user: userId,
      regimenName: 'Spanning cycle',
      startDate: new Date('2026-06-20T00:00:00.000Z'),
      endDate: new Date('2026-08-05T00:00:00.000Z'),
    }),
    Reminder.create({
      user: userId,
      title: 'July reminder',
      dueDate: new Date('2026-07-31T12:00:00.000Z'),
    }),
    Reminder.create({
      user: userId,
      title: 'August reminder',
      dueDate: new Date('2026-08-01T12:00:00.000Z'),
    }),
  ]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

const julyQuery =
  'startDate=2026-07-01T00:00:00.000Z&endDate=2026-07-31T23:59:59.999Z';

describe('calendar resource date ranges', () => {
  test('blood tests and pagination total are restricted to the range', async () => {
    const response = await request(app)
      .get(`/api/blood-tests?${julyQuery}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].date).toContain('2026-07-15');
    expect(response.body.pagination.total).toBe(1);
  });

  test('biochem tests are restricted to the range', async () => {
    const response = await request(app)
      .get(`/api/biochem-tests?${julyQuery}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].date).toContain('2026-07-20');
  });

  test('cycles that overlap the range are returned', async () => {
    const response = await request(app)
      .get(`/api/chemo-cycles?${julyQuery}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((cycle: any) => cycle.regimenName)).toContain(
      'Spanning cycle'
    );
  });

  test('reminders are restricted by dueDate', async () => {
    const response = await request(app)
      .get(`/api/reminders?${julyQuery}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((reminder: any) => reminder.title)).toEqual([
      'July reminder',
    ]);
  });

  test.each([
    '/api/blood-tests',
    '/api/biochem-tests',
    '/api/chemo-cycles',
    '/api/reminders',
  ])('%s rejects invalid dates', async (path) => {
    const response = await request(app)
      .get(`${path}?startDate=not-a-date`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(422);
  });

  test('reversed ranges are rejected', async () => {
    const response = await request(app)
      .get('/api/blood-tests?startDate=2026-08-01&endDate=2026-07-01')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(422);
  });
});
