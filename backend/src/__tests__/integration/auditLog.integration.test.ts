/**
 * 集成测试 - 审计日志 (L-P2)
 *
 * 覆盖：登录日志、新IP异常、暴力破解、各操作日志、GET 端点
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { AuditLog } from '../../models/AuditLog';

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

const testUser = {
  email: 'audit-test@example.com',
  password: 'Test1234!',
  fullName: 'Audit Tester',
};

let userCounter = 0;
async function registerAndLogin(): Promise<string> {
  userCounter += 1;
  const email = `audit-${userCounter}@example.com`;
  await request(app).post('/api/auth/register').send({
    email,
    password: testUser.password,
    fullName: testUser.fullName,
  });
  const res = await request(app).post('/api/auth/login').send({
    email,
    password: testUser.password,
  });
  return res.body.data.accessToken;
}

describe('审计日志集成测试 (L-P2)', () => {
  it('登录成功生成 login 审计日志', async () => {
    await registerAndLogin();
    const logs = await AuditLog.find({ action: 'login', success: true });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('登录失败生成失败日志', async () => {
    const token = await registerAndLogin();
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    const email = `audit-${userCounter}@example.com`;

    await request(app).post('/api/auth/login').send({
      email,
      password: 'WrongPass1!',
    });
    const logs = await AuditLog.find({
      user: decoded.id,
      action: 'login',
      success: false,
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].detail).toContain('密码错误');
  });

  it('新 IP 登录标记 isAnomaly + anomalyType=new_ip', async () => {
    // registerAndLogin 内部首次登录即为新 IP
    const token = await registerAndLogin();
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    const logs = await AuditLog.find({
      user: decoded.id,
      action: 'login',
      success: true,
      isAnomaly: true,
      anomalyType: 'new_ip',
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('旧 IP 再次登录不标记异常', async () => {
    const token = await registerAndLogin();
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    const email = `audit-${userCounter}@example.com`;

    // 第二次登录同一 IP
    await request(app).post('/api/auth/login').send({
      email,
      password: testUser.password,
    });

    const normalLogs = await AuditLog.find({
      user: decoded.id,
      action: 'login',
      success: true,
      isAnomaly: false,
    });
    expect(normalLogs.length).toBeGreaterThan(0);
  });

  it('同一 IP 5 次失败触发 brute_force 异常', async () => {
    // 清掉之前的失败日志避免干扰
    await AuditLog.deleteMany({ action: 'login', success: false });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({
        email: 'brute-force@example.com',
        password: 'WrongPass1!',
      });
    }

    const bruteForceLogs = await AuditLog.find({
      anomalyType: 'brute_force',
    });
    expect(bruteForceLogs.length).toBeGreaterThan(0);
    expect(bruteForceLogs[0].detail).toContain('暴力破解');
  });

  it('change-password 生成审计日志', async () => {
    const token = await registerAndLogin();
    await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: testUser.password, newPassword: 'NewPass1234!', confirmPassword: 'NewPass1234!' });

    const logs = await AuditLog.find({ action: 'change_password', success: true });
    expect(logs.length).toBeGreaterThan(0);
  });

  it('share create/revoke 生成审计日志', async () => {
    // 需先开启 dataSharing
    const token = await registerAndLogin();
    await request(app)
      .put('/api/auth/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataSharing: { enabled: true } });

    const created = await request(app)
      .post('/api/shares')
      .set('Authorization', `Bearer ${token}`)
      .send({
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresIn: '7d',
      });
    expect(created.status).toBe(201);

    const createLogs = await AuditLog.find({ action: 'share_create', success: true });
    expect(createLogs.length).toBeGreaterThan(0);

    await request(app)
      .delete(`/api/shares/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`);

    const revokeLogs = await AuditLog.find({ action: 'share_revoke', success: true });
    expect(revokeLogs.length).toBeGreaterThan(0);
  });

  it('GET /api/auth/audit-logs 返回当前用户最近 50 条', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get('/api/auth/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(50);
    // 不应包含 user 字段
    expect(res.body.data[0]).not.toHaveProperty('user');
  });

  it('GET /api/auth/audit-logs 未认证返回 401', async () => {
    const res = await request(app).get('/api/auth/audit-logs');
    expect(res.status).toBe(401);
  });
});
