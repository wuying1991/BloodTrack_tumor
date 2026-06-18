/**
 * 契约测试 - Reminder API
 *
 * 验证后端 API 响应与 contracts/index.ts 的 Reminder 定义完全一致。
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../../models/User';
import { Reminder } from '../../models/Reminder';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let accessToken: string;
let testUserId: string;

const testUser = {
  email: 'reminder-contract@example.com',
  password: 'TestPass123',
  firstName: 'Reminder',
  lastName: 'Contract',
  dateOfBirth: '1990-01-01',
  gender: 'male',
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testUser.password, salt);
  const user = await User.create({
    email: testUser.email,
    passwordHash,
    firstName: testUser.firstName,
    lastName: testUser.lastName,
    dateOfBirth: new Date(testUser.dateOfBirth),
    gender: testUser.gender,
  });
  testUserId = user._id.toString();

  const res = await request(app).post('/api/auth/login').send({
    email: testUser.email,
    password: testUser.password,
  });
  accessToken = res.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// 与 contracts/index.ts 的 Reminder interface 一致
const REMINDER_RESPONSE_SHAPE = {
  _id: 'string',
  user: 'string',
  title: 'string',
  description: 'string|undefined',
  type: 'string',
  dueDate: 'string',
  recurrence: 'string',
  enabled: 'boolean',
  completed: 'boolean',
  notifications: 'object',
  lastTriggeredAt: 'string|undefined',
  createdAt: 'string',
  updatedAt: 'string',
};

function validateShape(obj: any, shape: Record<string, string>, path = '') {
  const errors: string[] = [];

  for (const [key, expectedType] of Object.entries(shape)) {
    const fullPath = path ? `${path}.${key}` : key;
    const allowedTypes = expectedType.split('|');

    if (!(key in obj)) {
      if (!allowedTypes.includes('undefined')) {
        errors.push(`Missing required field: ${fullPath}`);
      }
      continue;
    }

    const value = obj[key];
    if (value === null || value === undefined) {
      if (!allowedTypes.includes('undefined')) {
        errors.push(`Field ${fullPath} is null/undefined but is required`);
      }
      continue;
    }

    if (!allowedTypes.includes(typeof value)) {
      errors.push(
        `Field ${fullPath} expected type ${expectedType}, got ${typeof value}`
      );
    }
  }
  return errors;
}

describe('Reminder API 契约测试', () => {
  describe('POST /api/reminders - 创建提醒', () => {
    it('响应数据形状必须匹配契约定义', async () => {
      const payload = {
        title: '复查血常规',
        description: '空腹',
        type: 'blood-test',
        dueDate: '2026-07-01T09:00:00.000Z',
        recurrence: 'weekly',
        enabled: true,
        notifications: { email: true, push: false },
      };

      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      const errors = validateShape(data, REMINDER_RESPONSE_SHAPE);
      expect(errors).toEqual([]);

      expect(data.notifications).toMatchObject({
        email: expect.any(Boolean),
        push: expect.any(Boolean),
      });
      expect(data.title).toBe(payload.title);
      expect(data.recurrence).toBe('weekly');
      expect(data.completed).toBe(false);
    });

    it('缺少 title/dueDate 时返回 422', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/reminders - 获取提醒列表', () => {
    it('响应必须包含 success + data 数组', async () => {
      const res = await request(app)
        .get('/api/reminders')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const errors = validateShape(res.body.data[0], REMINDER_RESPONSE_SHAPE);
        expect(errors).toEqual([]);
      }
    });
  });

  describe('GET /api/reminders/upcoming - 即将到期', () => {
    it('返回数组（在 horizon 内 enabled+未完成 的项）', async () => {
      const res = await request(app)
        .get('/api/reminders/upcoming?days=30')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/reminders/:id - 获取单个提醒', () => {
    let recordId: string;

    beforeAll(async () => {
      const r = await Reminder.create({
        user: testUserId,
        title: 'single-fetch',
        dueDate: new Date('2026-07-01T09:00:00.000Z'),
      });
      recordId = r._id.toString();
    });

    it('响应形状必须匹配契约', async () => {
      const res = await request(app)
        .get(`/api/reminders/${recordId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const errors = validateShape(res.body.data, REMINDER_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });

    it('不存在的 ID 返回 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/reminders/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/reminders/:id - 更新提醒', () => {
    let recordId: string;

    beforeAll(async () => {
      const r = await Reminder.create({
        user: testUserId,
        title: 'update-target',
        dueDate: new Date('2026-07-01T09:00:00.000Z'),
      });
      recordId = r._id.toString();
    });

    it('更新后响应形状匹配契约且字段已变更', async () => {
      const res = await request(app)
        .put(`/api/reminders/${recordId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'updated-title', recurrence: 'daily' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('updated-title');
      expect(res.body.data.recurrence).toBe('daily');
      const errors = validateShape(res.body.data, REMINDER_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });
  });

  describe('PATCH /api/reminders/:id/complete - 标记完成', () => {
    it('一次性提醒返回 completed=true', async () => {
      const r = await Reminder.create({
        user: testUserId,
        title: 'one-shot',
        dueDate: new Date('2026-07-01T09:00:00.000Z'),
        recurrence: 'none',
      });

      const res = await request(app)
        .patch(`/api/reminders/${r._id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.completed).toBe(true);
      const errors = validateShape(res.body.data, REMINDER_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });
  });

  describe('DELETE /api/reminders/:id - 删除提醒', () => {
    it('删除成功后返回 message', async () => {
      const r = await Reminder.create({
        user: testUserId,
        title: 'to-delete',
        dueDate: new Date('2026-07-01T09:00:00.000Z'),
      });

      const res = await request(app)
        .delete(`/api/reminders/${r._id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('未认证访问', () => {
    it('无 token 时返回 401', async () => {
      const res = await request(app).get('/api/reminders');
      expect(res.status).toBe(401);
    });
  });
});
