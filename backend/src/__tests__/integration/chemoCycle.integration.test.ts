/**
 * 集成测试 - ChemoCycle (M-P7)
 *
 * 覆盖：新 schema / 可选药物 / 周期边界 reconcile / 校验失败。
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
  email: 'chemo-integration@example.com',
  password: 'Test1234!',
  fullName: 'Chemo Tester',
};

function dayMs(iso: string): number {
  return new Date(iso).getTime();
}

describe('ChemoCycle 集成测试 (M-P7)', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send(user);
    token = res.body.data.accessToken;
  });

  it('只填 regimenName + startDate 可创建，endDate 默认 +21 天，medications 为空', async () => {
    const res = await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({ regimenName: 'VAC方案', startDate: '2026-06-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.regimenName).toBe('VAC方案');
    expect(dayMs(res.body.data.endDate) - dayMs(res.body.data.startDate)).toBe(
      21 * 24 * 60 * 60 * 1000
    );
    expect(res.body.data.medications).toEqual([]);
  });

  it('创建新周期后，上一个周期 endDate 自动变成新周期 startDate - 1 天', async () => {
    const second = await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({ regimenName: '第二周期', startDate: '2026-06-22' });
    expect(second.status).toBe(201);

    const list = await request(app)
      .get('/api/chemo-cycles?limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const first = list.body.data.find((c: any) => c.regimenName === 'VAC方案');
    expect(first).toBeDefined();
    expect(new Date(first.endDate).toISOString().slice(0, 10)).toBe('2026-06-21');
  });

  it('update startDate 后重算上一周期边界', async () => {
    const listBefore = await request(app)
      .get('/api/chemo-cycles?limit=10')
      .set('Authorization', `Bearer ${token}`);
    const second = listBefore.body.data.find((c: any) => c.regimenName === '第二周期');

    const updated = await request(app)
      .put(`/api/chemo-cycles/${second._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-06-25' });
    expect(updated.status).toBe(200);

    const listAfter = await request(app)
      .get('/api/chemo-cycles?limit=10')
      .set('Authorization', `Bearer ${token}`);
    const first = listAfter.body.data.find((c: any) => c.regimenName === 'VAC方案');
    expect(new Date(first.endDate).toISOString().slice(0, 10)).toBe('2026-06-24');
  });

  it('delete 中间/后续周期后不报错并保留剩余周期', async () => {
    const listBefore = await request(app)
      .get('/api/chemo-cycles?limit=10')
      .set('Authorization', `Bearer ${token}`);
    const second = listBefore.body.data.find((c: any) => c.regimenName === '第二周期');

    const del = await request(app)
      .delete(`/api/chemo-cycles/${second._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const listAfter = await request(app)
      .get('/api/chemo-cycles?limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(listAfter.body.data.some((c: any) => c.regimenName === 'VAC方案')).toBe(true);
    expect(listAfter.body.data.some((c: any) => c.regimenName === '第二周期')).toBe(false);
  });

  it('medications 为空数组可保存', async () => {
    const res = await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({ regimenName: '空药物方案', startDate: '2026-08-01', medications: [] });
    expect(res.status).toBe(201);
    expect(res.body.data.medications).toEqual([]);
  });

  it('medication 只填 notes 可保存，并默认药物起止日期为周期起止日期', async () => {
    const res = await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        regimenName: '备注方案',
        startDate: '2026-09-01',
        endDate: '2026-09-22',
        medications: [{ notes: '患者不清楚药物名称' }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.medications).toHaveLength(1);
    expect(res.body.data.medications[0].notes).toBe('患者不清楚药物名称');
    expect(new Date(res.body.data.medications[0].startDate).toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it('medication startDate > endDate 返回 422', async () => {
    const res = await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        regimenName: '错误药物日期',
        startDate: '2026-10-01',
        medications: [{ startDate: '2026-10-05', endDate: '2026-10-01' }],
      });
    expect(res.status).toBe(422);
  });

  it('regimenName 缺失返回 422', async () => {
    const res = await request(app)
      .post('/api/chemo-cycles')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-11-01' });
    expect(res.status).toBe(422);
  });
});
