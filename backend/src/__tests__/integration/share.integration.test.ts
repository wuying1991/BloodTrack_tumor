/**
 * 集成测试 - Share (受保护 API 部分)
 *
 * 覆盖：CRUD / 50 上限 / 总开关关闭 / 跨用户隔离 / never 过期
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { Share } from '../../models/Share';

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
  email: 'share-a@example.com',
  password: 'Test1234!',
  fullName: 'Share AlphaUser',
  dateOfBirth: '1990-01-01',
  gender: 'female',
};
const userB = {
  email: 'share-b@example.com',
  password: 'Test1234!',
  fullName: 'Share BetaUser',
  dateOfBirth: '1991-02-02',
  gender: 'male',
};

async function enableSharing(token: string) {
  await request(app)
    .put('/api/auth/settings')
    .set('Authorization', `Bearer ${token}`)
    .send({ dataSharing: { enabled: true } });
}

describe('Share 集成测试 (受保护 API)', () => {
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const a = await request(app).post('/api/auth/register').send(userA);
    tokenA = a.body.data.accessToken;
    const b = await request(app).post('/api/auth/register').send(userB);
    tokenB = b.body.data.accessToken;
    await enableSharing(tokenA);
    await enableSharing(tokenB);
  });

  it('创建 → 列表（无 token）→ 撤销 → 列表为空', async () => {
    const created = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(created.status).toBe(201);
    const id = created.body.data._id;

    const list = await request(app)
      .get('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.data.find((s: any) => s._id === id)).toBeDefined();
    expect(list.body.data[0]).not.toHaveProperty('token');

    const del = await request(app)
      .delete(`/api/shares/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(200);

    const after = await request(app)
      .get('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(after.body.data.find((s: any) => s._id === id)).toBeUndefined();
  });

  it('总开关关闭时拒绝创建（403）', async () => {
    await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ dataSharing: { enabled: false } });
    const r = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(r.status).toBe(403);
    await enableSharing(tokenB);
  });

  it('50 条上限（409）', async () => {
    // 直接 batch insert 50 条
    const aRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userA.email, password: userA.password });
    const aId = aRes.body.data._id;
    const docs = Array.from({ length: 50 }, () => ({
      user: aId,
      token: require('crypto').randomBytes(32).toString('hex'),
      pinHash: null,
      scope: { bloodTests: true, chemoCycles: false, analytics: false },
      expiresAt: null,
    }));
    await Share.insertMany(docs);

    const r = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/50/);

    // 清理
    await Share.deleteMany({ user: aId });
  });

  it('跨用户隔离：B 不能撤销 A 的链接', async () => {
    const created = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: 'never',
      });
    const id = created.body.data._id;

    const r = await request(app)
      .delete(`/api/shares/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(r.status).toBe(404);

    // 清理
    await request(app)
      .delete(`/api/shares/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
  });

  it('expiresIn=never 时 expiresAt 为 null', async () => {
    const r = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: 'never',
      });
    expect(r.body.data.expiresAt).toBeNull();
  });

  describe('公开 viewer API', () => {
    let publicToken: string;
    let publicTokenWithPin: string;
    let expiredToken: string;
    let userAId: string;

    beforeAll(async () => {
      const aLogin = await request(app).post('/api/auth/login').send({
        email: userA.email,
        password: userA.password,
      });
      userAId = aLogin.body.data._id;

      // 给 A 录一些数据：1 条血常规 + 1 个化疗周期
      await request(app)
        .post('/api/blood-tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          date: '2026-06-01',
          wbc: 5.0, rbc: 4.5, hgb: 130, plt: 200,
        });
      await request(app)
        .post('/api/chemo-cycles')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          startDate: '2026-05-01',
          endDate: '2026-05-08',
          medications: [{ name: 'A', dosage: '50mg', schedule: 'qd' }],
        });

      // 创建 3 个 share：无 PIN / 有 PIN / 已过期
      const noPin = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          scope: { bloodTests: true, chemoCycles: true, analytics: true },
          expiresIn: '7d',
        });
      publicToken = noPin.body.data.token;

      const withPin = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: '7d',
          pin: '4321',
        });
      publicTokenWithPin = withPin.body.data.token;

      // 已过期：直接 insertOne 写一个过去的 expiresAt
      const expDoc = await Share.create({
        user: userAId,
        token: require('crypto').randomBytes(32).toString('hex'),
        pinHash: null,
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: new Date(Date.now() - 1000),
      });
      expiredToken = expDoc.token;
    });

    it('GET /:token 返回 owner 姓名 + scope + requiresPin', async () => {
      const res = await request(app).get(`/api/public/shares/${publicToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.ownerName).toBe(userA.fullName);
      expect(res.body.data.requiresPin).toBe(false);
      expect(res.body.data.scope).toEqual({
        bloodTests: true, chemoCycles: true, analytics: true,
      });
      // 不应泄露 email/dateOfBirth/_id
      expect(res.body.data).not.toHaveProperty('email');
      expect(res.body.data).not.toHaveProperty('dateOfBirth');
    });

    it('GET /:token 不存在返回 404', async () => {
      const fakeToken = 'a'.repeat(64);
      const res = await request(app).get(`/api/public/shares/${fakeToken}`);
      expect(res.status).toBe(404);
    });

    it('GET /:token 已过期返回 410', async () => {
      const res = await request(app).get(`/api/public/shares/${expiredToken}`);
      expect(res.status).toBe(410);
    });

    it('POST /:token/verify 无 PIN 链接直接 200', async () => {
      const res = await request(app)
        .post(`/api/public/shares/${publicToken}/verify`)
        .send({});
      expect(res.status).toBe(200);
    });

    it('POST /:token/verify 正确 PIN 返回 200', async () => {
      const res = await request(app)
        .post(`/api/public/shares/${publicTokenWithPin}/verify`)
        .send({ pin: '4321' });
      expect(res.status).toBe(200);
    });

    it('POST /:token/verify 错误 PIN 返回 401', async () => {
      const res = await request(app)
        .post(`/api/public/shares/${publicTokenWithPin}/verify`)
        .send({ pin: '0000' });
      expect(res.status).toBe(401);
    });

    it('GET /:token/blood-tests 无 PIN 链接返回数据', async () => {
      const res = await request(app).get(`/api/public/shares/${publicToken}/blood-tests`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /:token/blood-tests 有 PIN 缺 header 返回 401', async () => {
      const res = await request(app).get(`/api/public/shares/${publicTokenWithPin}/blood-tests`);
      expect(res.status).toBe(401);
    });

    it('GET /:token/blood-tests 有 PIN 正确 header 返回数据', async () => {
      const res = await request(app)
        .get(`/api/public/shares/${publicTokenWithPin}/blood-tests`)
        .set('X-Share-Pin', '4321');
      expect(res.status).toBe(200);
    });

    it('GET /:token/chemo-cycles 不在 scope 中返回 403', async () => {
      const res = await request(app)
        .get(`/api/public/shares/${publicTokenWithPin}/chemo-cycles`)
        .set('X-Share-Pin', '4321');
      expect(res.status).toBe(403);
    });

    it('GET /:token/analytics 返回 trends + summary', async () => {
      const res = await request(app).get(`/api/public/shares/${publicToken}/analytics?range=all`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('trends');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data.summary).toHaveProperty('totalTests');
      expect(res.body.data.summary).toHaveProperty('abnormalRate');
    });

    it('deleteAccount 后 share 级联删除（旧 token → 404）', async () => {
      // 注册一个临时用户 + 创建 share + 删账户 + 检查 token 失效
      const tmp = await request(app).post('/api/auth/register').send({
        email: 'share-cascade@example.com',
        password: 'Test1234!',
        fullName: 'Cascade User',
        dateOfBirth: '1992-01-01',
        gender: 'male',
      });
      const tmpToken = tmp.body.data.accessToken;
      await enableSharing(tmpToken);
      const created = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${tmpToken}`)
        .send({
          scope: { bloodTests: true, chemoCycles: false, analytics: false },
          expiresIn: 'never',
        });
      const orphanToken = created.body.data.token;

      // 删账户
      const del = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${tmpToken}`)
        .send({ password: 'Test1234!' });
      expect(del.status).toBe(200);
      expect(del.body.data.shares).toBe(1);

      const r = await request(app).get(`/api/public/shares/${orphanToken}`);
      expect(r.status).toBe(404);
    });
  });
});
