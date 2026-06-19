/**
 * 契约测试 - Share API
 *
 * 验证后端 API 响应与 contracts/index.ts 的 Share / ShareCreateResponseData 定义一致。
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import app from '../../app';
import { User } from '../../models/User';

let mongoServer: MongoMemoryServer;
let accessToken: string;

const testUser = {
  email: 'share-contract@example.com',
  password: 'TestPass123',
  firstName: 'Share',
  lastName: 'Contract',
  dateOfBirth: '1990-01-01',
  gender: 'male',
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testUser.password, salt);
  await User.create({
    email: testUser.email,
    passwordHash,
    firstName: testUser.firstName,
    lastName: testUser.lastName,
    dateOfBirth: new Date(testUser.dateOfBirth),
    gender: testUser.gender,
    settings: {
      notifications: { email: true, push: true },
      dataSharing: { enabled: true, sharedWith: [] },
    },
  });

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

const SHARE_LIST_SHAPE = {
  _id: 'string',
  scope: 'object',
  expiresAt: 'string|object',  // ISO string 或 null (typeof null === 'object')
  hasPin: 'boolean',
  createdAt: 'string',
};

const SHARE_CREATE_SHAPE = {
  ...SHARE_LIST_SHAPE,
  token: 'string',
  shareUrl: 'string',
};

function validateShape(obj: any, shape: Record<string, string>) {
  const errors: string[] = [];
  for (const [k, expected] of Object.entries(shape)) {
    const allowed = expected.split('|');
    if (!(k in obj)) {
      errors.push(`Missing field: ${k}`);
      continue;
    }
    const v = obj[k];
    if (v === null) {
      if (!allowed.includes('object')) errors.push(`Field ${k} is null`);
      continue;
    }
    if (!allowed.includes(typeof v)) {
      errors.push(`Field ${k} expected ${expected}, got ${typeof v}`);
    }
  }
  return errors;
}

describe('Share API 契约测试', () => {
  describe('POST /api/shares - 创建分享', () => {
    it('响应数据形状必须匹配契约（含 token + shareUrl）', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: true },
          expiresIn: '7d',
          pin: '1234',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const errors = validateShape(res.body.data, SHARE_CREATE_SHAPE);
      expect(errors).toEqual([]);
      expect(res.body.data.token).toMatch(/^[a-f0-9]{64}$/);
      expect(res.body.data.shareUrl).toContain('/share/');
      expect(res.body.data.hasPin).toBe(true);
    });

    it('总开关关闭时返回 403', async () => {
      // 临时关掉
      await User.updateOne(
        { email: testUser.email },
        { $set: { 'settings.dataSharing.enabled': false } }
      );
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: '7d',
        });
      expect(res.status).toBe(403);
      // 恢复
      await User.updateOne(
        { email: testUser.email },
        { $set: { 'settings.dataSharing.enabled': true } }
      );
    });

    it('scope 全 false 返回 422', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: false, chemoCycles: false, analytics: false },
          expiresIn: '7d',
        });
      expect(res.status).toBe(422);
    });

    it('pin 非数字返回 422', async () => {
      const res = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: '7d',
          pin: 'abcd',
        });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/shares - 列表', () => {
    it('响应不含 token 字段', async () => {
      const res = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const errors = validateShape(res.body.data[0], SHARE_LIST_SHAPE);
      expect(errors).toEqual([]);
      expect(res.body.data[0]).not.toHaveProperty('token');
      expect(res.body.data[0]).not.toHaveProperty('pinHash');
    });
  });

  describe('DELETE /api/shares/:id', () => {
    it('删除成功返回 message', async () => {
      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: 'never',
        });
      const id = created.body.data._id;

      const res = await request(app)
        .delete(`/api/shares/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('未认证访问', () => {
    it('无 token 时返回 401', async () => {
      const res = await request(app).get('/api/shares');
      expect(res.status).toBe(401);
    });
  });
});
