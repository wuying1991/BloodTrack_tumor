/**
 * 契约测试 - ChemoCycle API
 *
 * 验证后端 API 响应与 contracts/index.ts 的定义完全一致
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../../models/User';
import { ChemoCycle } from '../../models/ChemoCycle';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let accessToken: string;
let testUserId: string;

const testUser = {
  email: 'chemo-contract-test@example.com',
  password: 'TestPass123',
  fullName: 'Chemo Tester',
  dateOfBirth: '1990-06-15',
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
    fullName: testUser.fullName,
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

// ChemoCycle 响应契约定义
const CHEMO_CYCLE_RESPONSE_SHAPE = {
  _id: 'string',
  user: 'string',
  startDate: 'string',
  endDate: 'string',
  medications: 'object',
  doctorNotes: 'string|undefined',
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

    const actualType = Array.isArray(value) ? 'object' : typeof value;
    if (!allowedTypes.includes(actualType)) {
      errors.push(
        `Field ${fullPath} expected type ${expectedType}, got ${actualType}`
      );
    }
  }
  return errors;
}

const validCycleData = {
  startDate: '2024-03-01',
  endDate: '2024-05-01',
  medications: [
    { name: '环磷酰胺', dosage: '500mg', schedule: '每3周一次' },
    { name: '多柔比星', dosage: '50mg', schedule: '每3周一次' },
  ],
  doctorNotes: '第一期化疗方案',
};

describe('ChemoCycle API 契约测试', () => {
  describe('POST /api/chemo-cycles - 创建化疗周期', () => {
    it('响应数据形状必须匹配契约定义', async () => {
      const res = await request(app)
        .post('/api/chemo-cycles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validCycleData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');

      const data = res.body.data;
      const errors = validateShape(data, CHEMO_CYCLE_RESPONSE_SHAPE);
      expect(errors).toEqual([]);

      expect(typeof data._id).toBe('string');
      expect(typeof data.user).toBe('string');
      expect(Array.isArray(data.medications)).toBe(true);
      expect(data.medications.length).toBe(2);
      expect(data.medications[0]).toHaveProperty('name');
      expect(data.medications[0]).toHaveProperty('dosage');
      expect(data.medications[0]).toHaveProperty('schedule');
    });

    it('缺少必填字段时返回 422', async () => {
      const res = await request(app)
        .post('/api/chemo-cycles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/chemo-cycles - 获取化疗周期列表', () => {
    beforeAll(async () => {
      await ChemoCycle.create({
        user: testUserId,
        ...validCycleData,
      });
    });

    it('响应包含 data 数组', async () => {
      const res = await request(app)
        .get('/api/chemo-cycles')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const firstItem = res.body.data[0];
        const errors = validateShape(firstItem, CHEMO_CYCLE_RESPONSE_SHAPE);
        expect(errors).toEqual([]);
      }
    });
  });

  describe('GET /api/chemo-cycles/:id - 获取单个化疗周期', () => {
    let testCycleId: string;

    beforeAll(async () => {
      const cycle = await ChemoCycle.create({
        user: testUserId,
        ...validCycleData,
      });
      testCycleId = cycle._id.toString();
    });

    it('响应数据形状匹配契约', async () => {
      const res = await request(app)
        .get(`/api/chemo-cycles/${testCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const errors = validateShape(res.body.data, CHEMO_CYCLE_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });

    it('不存在的 ID 返回 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/chemo-cycles/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/chemo-cycles/:id - 更新化疗周期', () => {
    let updateCycleId: string;

    beforeAll(async () => {
      const cycle = await ChemoCycle.create({
        user: testUserId,
        ...validCycleData,
      });
      updateCycleId = cycle._id.toString();
    });

    it('更新后响应匹配契约', async () => {
      const res = await request(app)
        .put(`/api/chemo-cycles/${updateCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ doctorNotes: 'Updated plan' });

      expect(res.status).toBe(200);
      expect(res.body.data.doctorNotes).toBe('Updated plan');
      const errors = validateShape(res.body.data, CHEMO_CYCLE_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });
  });

  describe('DELETE /api/chemo-cycles/:id - 删除化疗周期', () => {
    let deleteCycleId: string;

    beforeAll(async () => {
      const cycle = await ChemoCycle.create({
        user: testUserId,
        ...validCycleData,
      });
      deleteCycleId = cycle._id.toString();
    });

    it('删除返回正确格式', async () => {
      const res = await request(app)
        .delete(`/api/chemo-cycles/${deleteCycleId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('未认证访问', () => {
    it('无 token 返回 401', async () => {
      const res = await request(app).get('/api/chemo-cycles');
      expect(res.status).toBe(401);
    });
  });
});
