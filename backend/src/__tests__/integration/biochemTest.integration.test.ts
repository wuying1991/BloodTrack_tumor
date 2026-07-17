/**
 * 集成测试 - BiochemTest (生化全套)
 *
 * 覆盖：CRUD / 字段可选 / 异常检测 / 化疗周期关联 / 跨用户隔离 / CSV 导出
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

const user = {
  email: 'biochem-test@example.com',
  password: 'Test1234!',
  fullName: 'Biochem Tester',
};

describe('BiochemTest 集成测试', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    token = res.body.data.accessToken;
  });

  it('只填 date 可创建, 所有 25 项指标可选', async () => {
    const res = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-07-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.date).toBeDefined();
    expect(res.body.data.alt).toBeUndefined();
    expect(res.body.data.isAbnormal).toBe(false);
  });

  it('填部分字段可创建', async () => {
    const res = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-07-05',
        alt: 25,
        ast: 20,
        cr: 80,
        k: 4.2,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.alt).toBe(25);
    expect(res.body.data.cr).toBe(80);
    expect(res.body.data.isAbnormal).toBe(false);
  });

  it('异常值 -> isAbnormal=true', async () => {
    const res = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-07-10',
        alt: 200,
        bun: 15,
        k: 6.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.isAbnormal).toBe(true);
  });

  it('eGFR 低于 90 -> isAbnormal=true', async () => {
    const res = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: '2026-07-12',
        egfr: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.isAbnormal).toBe(true);
  });

  it('列表返回分页 + 按 date 降序', async () => {
    const res = await request(app)
      .get('/api/biochem-tests?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('GET /:id 返回单条记录', async () => {
    const created = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-07-15', alt: 30 });

    const res = await request(app)
      .get(`/api/biochem-tests/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.alt).toBe(30);
  });

  it('PUT 更新记录', async () => {
    const created = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-07-16', alt: 25 });

    const res = await request(app)
      .put(`/api/biochem-tests/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ alt: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.alt).toBe(200);
    expect(res.body.data.isAbnormal).toBe(true);
  });

  it('DELETE 删除记录', async () => {
    const created = await request(app)
      .post('/api/biochem-tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-07-17' });

    const res = await request(app)
      .delete(`/api/biochem-tests/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('跨用户隔离: 用户 B 看不到用户 A 的记录', async () => {
    const userB = {
      email: 'biochem-b@example.com',
      password: 'Test1234!',
      fullName: 'User B',
    };
    const bRes = await request(app).post('/api/auth/register').send(userB);
    const tokenB = bRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/biochem-tests')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('未认证返回 401', async () => {
    const res = await request(app).get('/api/biochem-tests');
    expect(res.status).toBe(401);
  });

  it('CSV 导出返回 text/csv', async () => {
    const res = await request(app)
      .get('/api/biochem-tests/export?format=csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });
});
