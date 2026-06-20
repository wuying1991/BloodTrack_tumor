/**
 * 集成测试 - DELETE /api/auth/account (M-P5 / GDPR)
 *
 * 覆盖：
 * - 未授权 / 缺密码 / 错误密码
 * - 成功删除：用户 + BloodTest + ChemoCycle + Reminder 全部清空
 * - 删除后 token 不可再访问受保护资源 (用户已不存在)
 * - 跨用户隔离：删除 userA 不影响 userB 的数据
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../../models/User';
import { BloodTest } from '../../models/BloodTest';
import { ChemoCycle } from '../../models/ChemoCycle';
import { Reminder } from '../../models/Reminder';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

const userA = {
  email: 'delete-a@example.com',
  password: 'Test1234!',
  fullName: 'Del AlphaUser',
  dateOfBirth: '1990-01-01',
  gender: 'female',
};

const userB = {
  email: 'delete-b@example.com',
  password: 'Test1234!',
  fullName: 'Del BetaUser',
  dateOfBirth: '1991-02-02',
  gender: 'male',
};

describe('DELETE /api/auth/account 集成测试', () => {
  let tokenA: string;
  let tokenB: string;
  let userAId: string;

  beforeAll(async () => {
    const a = await request(app).post('/api/auth/register').send(userA);
    tokenA = a.body.data.accessToken;
    userAId = a.body.data._id;

    const b = await request(app).post('/api/auth/register').send(userB);
    tokenB = b.body.data.accessToken;

    // 给 userA 灌点数据
    await request(app)
      .post('/api/blood-tests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ date: '2026-01-01', wbc: 5, rbc: 4.5, hgb: 140, plt: 200 });
    await request(app)
      .post('/api/blood-tests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ date: '2026-02-01', wbc: 5, rbc: 4.5, hgb: 140, plt: 200 });
    await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        startDate: '2026-01-01',
        endDate: '2026-01-15',
        medications: [{ name: 'X', dosage: '100mg', schedule: 'D1' }],
      });
    await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'r1', dueDate: '2026-07-01' });

    // 给 userB 也来一条，验证不被误删
    await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'b-keepme', dueDate: '2026-07-01' });
  });

  describe('错误路径', () => {
    it('未携带 token → 401', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .send({ password: userA.password });
      expect(res.status).toBe(401);
    });

    it('缺少 password 字段 → 422', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});
      expect(res.status).toBe(422);
    });

    it('密码错误 → 401，且数据未被删除', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ password: 'WrongPass!' });
      expect(res.status).toBe(401);

      const stillExists = await User.findById(userAId);
      expect(stillExists).not.toBeNull();
      const bts = await BloodTest.countDocuments({ user: userAId });
      expect(bts).toBe(2);
    });
  });

  describe('成功路径', () => {
    it('密码正确 → 200，返回各 collection 删除计数', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ password: userA.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        bloodTests: 2,
        chemoCycles: 1,
        reminders: 1,
      });
    });

    it('User 文档已删除', async () => {
      const u = await User.findById(userAId);
      expect(u).toBeNull();
    });

    it('userA 的所有 BloodTest/ChemoCycle/Reminder 都已删除', async () => {
      expect(await BloodTest.countDocuments({ user: userAId })).toBe(0);
      expect(await ChemoCycle.countDocuments({ user: userAId })).toBe(0);
      expect(await Reminder.countDocuments({ user: userAId })).toBe(0);
    });

    it('删除后旧 token 访问受保护资源失败（用户不存在）', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${tokenA}`);
      // protect 中间件查不到 user → 401
      expect(res.status).toBe(401);
    });

    it('userB 的数据未被波及', async () => {
      const res = await request(app)
        .get('/api/reminders')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      const titles = res.body.data.map((r: any) => r.title);
      expect(titles).toContain('b-keepme');
    });
  });
});
