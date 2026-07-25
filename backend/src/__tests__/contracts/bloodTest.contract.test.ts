/**
 * 契约测试 - BloodTest API
 *
 * 验证后端 API 响应与 contracts/index.ts 的定义完全一致
 * 如果测试失败 = 契约被破坏，必须立即修复
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../../models/User';
import { BloodTest } from '../../models/BloodTest';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let accessToken: string;
let testUserId: string;

const testUser = {
  email: 'contract-test@example.com',
  password: 'TestPass123',
  fullName: 'Contract Tester',
  dateOfBirth: '1990-01-01',
  gender: 'male',
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create test user
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

  // Login to get token
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

// ============================================================
// BloodTest 响应契约定义 (必须与 contracts/index.ts 一致)
// ============================================================

const BLOOD_TEST_RESPONSE_SHAPE = {
  _id: 'string',
  user: 'string',
  date: 'string',
  wbc: 'number',
  rbc: 'number',
  hgb: 'number',
  plt: 'number',
  neu: 'number|undefined',
  lym: 'number|undefined',
  notes: 'string|undefined',
  isAbnormal: 'boolean',
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

// ============================================================
// 测试用例
// ============================================================

describe('BloodTest API 契约测试', () => {
  describe('POST /api/blood-tests - 创建血常规记录', () => {
    it('响应数据形状必须匹配契约定义', async () => {
      const testData = {
        date: '2024-01-15',
        wbc: 5.2,
        rbc: 4.5,
        hgb: 140,
        plt: 250,
        neu: 3.0,
        lym: 1.8,
        notes: 'Contract test record',
      };

      const res = await request(app)
        .post('/api/blood-tests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testData);

      // 验证 HTTP 状态码
      expect(res.status).toBe(201);

      // 验证响应包装结构
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');

      // 验证 data 字段契约
      const data = res.body.data;
      const errors = validateShape(data, BLOOD_TEST_RESPONSE_SHAPE);
      expect(errors).toEqual([]);

      // 验证数据类型精确性
      expect(typeof data._id).toBe('string');
      expect(typeof data.user).toBe('string');
      expect(typeof data.date).toBe('string');
      expect(typeof data.wbc).toBe('number');
      expect(typeof data.rbc).toBe('number');
      expect(typeof data.hgb).toBe('number');
      expect(typeof data.plt).toBe('number');
      expect(data.isAbnormal).toBeDefined();
      expect(typeof data.isAbnormal).toBe('boolean');
    });

    it('缺少必填字段时返回 422', async () => {
      const res = await request(app)
        .post('/api/blood-tests')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/blood-tests - 获取血常规列表', () => {
    it('响应必须包含 data 数组和 pagination 对象', async () => {
      const res = await request(app)
        .get('/api/blood-tests')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('pagination');

      // 验证 pagination 契约
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('pages');
      expect(typeof res.body.pagination.page).toBe('number');
      expect(typeof res.body.pagination.limit).toBe('number');
      expect(typeof res.body.pagination.total).toBe('number');
      expect(typeof res.body.pagination.pages).toBe('number');

      // 验证数组中每个元素的契约
      if (res.body.data.length > 0) {
        const firstItem = res.body.data[0];
        const errors = validateShape(firstItem, BLOOD_TEST_RESPONSE_SHAPE);
        expect(errors).toEqual([]);
      }
    });
  });

  describe('GET /api/blood-tests/:id - 获取单个血常规记录', () => {
    let testRecordId: string;

    beforeAll(async () => {
      const record = await BloodTest.create({
        user: testUserId,
        date: new Date('2024-01-15'),
        wbc: 5.2,
        rbc: 4.5,
        hgb: 140,
        plt: 250,
      });
      testRecordId = record._id.toString();
    });

    it('响应数据形状必须匹配契约定义', async () => {
      const res = await request(app)
        .get(`/api/blood-tests/${testRecordId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      const errors = validateShape(data, BLOOD_TEST_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });

    it('不存在的 ID 返回 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/blood-tests/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/blood-tests/:id - 更新血常规记录', () => {
    let testRecordId: string;

    beforeAll(async () => {
      const record = await BloodTest.create({
        user: testUserId,
        date: new Date('2024-01-15'),
        wbc: 5.2,
        rbc: 4.5,
        hgb: 140,
        plt: 250,
      });
      testRecordId = record._id.toString();
    });

    it('更新后响应形状必须匹配契约', async () => {
      const res = await request(app)
        .put(`/api/blood-tests/${testRecordId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ wbc: 6.0, notes: 'Updated via contract test' });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.wbc).toBe(6.0);
      expect(data.notes).toBe('Updated via contract test');
      const errors = validateShape(data, BLOOD_TEST_RESPONSE_SHAPE);
      expect(errors).toEqual([]);
    });

    it('更新 NEU 后重新计算整体异常状态', async () => {
      const res = await request(app)
        .put(`/api/blood-tests/${testRecordId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ neu: 1.7 });

      expect(res.status).toBe(200);
      expect(res.body.data.neu).toBe(1.7);
      expect(res.body.data.isAbnormal).toBe(true);
    });
  });

  describe('DELETE /api/blood-tests/:id - 删除血常规记录', () => {
    let deleteRecordId: string;

    beforeAll(async () => {
      const record = await BloodTest.create({
        user: testUserId,
        date: new Date('2024-01-15'),
        wbc: 5.2,
        rbc: 4.5,
        hgb: 140,
        plt: 250,
      });
      deleteRecordId = record._id.toString();
    });

    it('删除成功后返回正确的响应格式', async () => {
      const res = await request(app)
        .delete(`/api/blood-tests/${deleteRecordId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('未认证访问', () => {
    it('无 token 时返回 401', async () => {
      const res = await request(app).get('/api/blood-tests');
      expect(res.status).toBe(401);
    });
  });
});
