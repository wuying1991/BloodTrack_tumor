/**
 * 集成测试 - Reminder
 *
 * 覆盖：CRUD / upcoming / complete (一次性 vs 递归滚动) / 未授权 / 校验失败 / 跨用户隔离
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';

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
  email: 'reminder-a@example.com',
  password: 'Test1234!',
  firstName: 'Rem',
  lastName: 'AlphaUser',
  dateOfBirth: '1990-01-01',
  gender: 'female',
};

const userB = {
  email: 'reminder-b@example.com',
  password: 'Test1234!',
  firstName: 'Rem',
  lastName: 'BetaUser',
  dateOfBirth: '1991-02-02',
  gender: 'male',
};

describe('Reminder 集成测试', () => {
  let tokenA: string;
  let tokenB: string;
  let createdId: string;
  let recurringId: string;

  beforeAll(async () => {
    const a = await request(app).post('/api/auth/register').send(userA);
    tokenA = a.body.data.accessToken;
    const b = await request(app).post('/api/auth/register').send(userB);
    tokenB = b.body.data.accessToken;
  });

  describe('未认证访问', () => {
    it('无 token 时所有路由返回 401', async () => {
      const r1 = await request(app).get('/api/reminders');
      const r2 = await request(app).post('/api/reminders').send({});
      const r3 = await request(app).get('/api/reminders/upcoming');
      expect(r1.status).toBe(401);
      expect(r2.status).toBe(401);
      expect(r3.status).toBe(401);
    });
  });

  describe('字段校验', () => {
    it('缺少 title/dueDate → 422', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ description: 'no title' });
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('非法 type/recurrence → 422', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'x',
          dueDate: '2026-07-01',
          type: 'NOT_A_TYPE',
          recurrence: 'yearly',
        });
      expect(res.status).toBe(422);
    });

    it('非法 dueDate → 422', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'x', dueDate: 'not-a-date' });
      expect(res.status).toBe(422);
    });
  });

  describe('CRUD 流程', () => {
    it('POST → 创建一个 weekly 提醒', async () => {
      const res = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '复查血常规',
          description: '空腹',
          type: 'blood-test',
          dueDate: '2026-07-01T09:00:00.000Z',
          recurrence: 'weekly',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('复查血常规');
      expect(res.body.data.recurrence).toBe('weekly');
      expect(res.body.data.completed).toBe(false);
      createdId = res.body.data._id;
    });

    it('GET / → 列表包含刚创建的提醒', async () => {
      const res = await request(app)
        .get('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.find((r: any) => r._id === createdId)).toBeTruthy();
    });

    it('GET /?status=completed → 不包含未完成的', async () => {
      const res = await request(app)
        .get('/api/reminders?status=completed')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.find((r: any) => r._id === createdId)).toBeFalsy();
    });

    it('GET /:id → 拿到详情', async () => {
      const res = await request(app)
        .get(`/api/reminders/${createdId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(createdId);
    });

    it('PUT /:id → 更新成功，user 不可被 body 改写', async () => {
      const res = await request(app)
        .put(`/api/reminders/${createdId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '复查血常规-改',
          // 试图把 user 改成另一个 ObjectId，应被忽略
          user: new mongoose.Types.ObjectId().toString(),
        });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('复查血常规-改');
      // 仍然属于 userA：用 userA 的 token 还能查到
      const fetch = await request(app)
        .get(`/api/reminders/${createdId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(fetch.status).toBe(200);
    });

    it('DELETE /:id → 删除成功，再 GET 返回 404', async () => {
      const r = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'to-delete', dueDate: '2026-08-01' });
      const id = r.body.data._id;

      const del = await request(app)
        .delete(`/api/reminders/${id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(del.status).toBe(200);

      const get = await request(app)
        .get(`/api/reminders/${id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(get.status).toBe(404);
    });
  });

  describe('PATCH /:id/complete', () => {
    it('一次性提醒 → completed=true', async () => {
      const r = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'one-shot',
          dueDate: '2026-07-10T09:00:00.000Z',
          recurrence: 'none',
        });
      const id = r.body.data._id;

      const done = await request(app)
        .patch(`/api/reminders/${id}/complete`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(done.status).toBe(200);
      expect(done.body.data.completed).toBe(true);
      expect(done.body.data.lastTriggeredAt).toBeDefined();
    });

    it('weekly 提醒 → completed 仍为 false，dueDate 推进 7 天', async () => {
      const original = '2026-07-01T09:00:00.000Z';
      const r = await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'weekly-rolling',
          dueDate: original,
          recurrence: 'weekly',
        });
      recurringId = r.body.data._id;

      const done = await request(app)
        .patch(`/api/reminders/${recurringId}/complete`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(done.status).toBe(200);
      expect(done.body.data.completed).toBe(false);

      const before = new Date(original).getTime();
      const after = new Date(done.body.data.dueDate).getTime();
      expect(after - before).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('GET /upcoming', () => {
    beforeAll(async () => {
      // 5 天后到期 (在窗口内)
      await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'in-5-days',
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        });
      // 60 天后到期 (默认 7 天窗口外)
      await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'in-60-days',
          dueDate: new Date(Date.now() + 60 * 86400000).toISOString(),
        });
      // disabled，应被排除
      await request(app)
        .post('/api/reminders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'in-3-days-disabled',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          enabled: false,
        });
    });

    it('默认 7 天窗口只返回窗口内 enabled+未完成', async () => {
      const res = await request(app)
        .get('/api/reminders/upcoming')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const titles = res.body.data.map((r: any) => r.title);
      expect(titles).toContain('in-5-days');
      expect(titles).not.toContain('in-60-days');
      expect(titles).not.toContain('in-3-days-disabled');
    });

    it('days=90 → 包含 60 天后的', async () => {
      const res = await request(app)
        .get('/api/reminders/upcoming?days=90')
        .set('Authorization', `Bearer ${tokenA}`);
      const titles = res.body.data.map((r: any) => r.title);
      expect(titles).toContain('in-60-days');
    });
  });

  describe('跨用户隔离', () => {
    it('userB 不能 GET userA 的提醒', async () => {
      const res = await request(app)
        .get(`/api/reminders/${createdId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    it('userB 不能 DELETE userA 的提醒', async () => {
      const res = await request(app)
        .delete(`/api/reminders/${createdId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    it('userB 列表不包含 userA 的提醒', async () => {
      const res = await request(app)
        .get('/api/reminders')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((r: any) => r._id);
      expect(ids).not.toContain(createdId);
    });
  });
});
