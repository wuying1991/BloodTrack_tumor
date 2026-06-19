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
  firstName: 'Share',
  lastName: 'AlphaUser',
  dateOfBirth: '1990-01-01',
  gender: 'female',
};
const userB = {
  email: 'share-b@example.com',
  password: 'Test1234!',
  firstName: 'Share',
  lastName: 'BetaUser',
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
});
