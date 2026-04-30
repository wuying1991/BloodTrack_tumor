/**
 * 集成测试 - Auth
 *
 * 验证完整的认证流程:
 * 注册 → 登录 → 获取资料 → 更新资料 → 更新设置 → 忘记密码 → 重置密码 → 登出
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app';
import { User } from '../../models/User';
import bcrypt from 'bcryptjs';

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

const newUser = {
  email: 'integration-test@example.com',
  password: 'Test1234!',
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: '1995-06-15',
  gender: 'male',
};

describe('Auth 全链路集成测试', () => {
  let accessToken: string;
  let refreshToken: string;
  let resetToken: string;

  // ============================================================
  // 场景1: 新用户注册 → 登录 → 获取资料
  // ============================================================
  describe('场景1: 注册 → 登录 → 获取资料', () => {
    it('POST /api/auth/register - 注册新用户', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.email).toBe(newUser.email);
      expect(res.body.data.firstName).toBe(newUser.firstName);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('POST /api/auth/register - 重复邮箱返回409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(res.status).toBe(409);
    });

    it('POST /api/auth/login - 正确凭据登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: newUser.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
    });

    it('POST /api/auth/login - 错误密码返回401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('GET /api/auth/profile - 获取当前用户资料', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(newUser.email);
      expect(res.body.data.firstName).toBe(newUser.firstName);
      expect(res.body.data.lastName).toBe(newUser.lastName);
      expect(res.body.data).not.toHaveProperty('passwordHash');
      expect(res.body.data).not.toHaveProperty('resetPasswordToken');
    });

    it('GET /api/auth/profile - 无token返回401', async () => {
      const res = await request(app).get('/api/auth/profile');
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // 场景2: Token 刷新
  // ============================================================
  describe('场景2: Token 刷新', () => {
    it('POST /api/auth/refresh-token - 有效refresh token获取新token对', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('POST /api/auth/refresh-token - 无效token返回401', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    it('POST /api/auth/refresh-token - 缺少token返回400', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // 场景3: 更新资料 → 更新设置
  // ============================================================
  describe('场景3: 更新资料与设置', () => {
    it('PUT /api/auth/profile - 更新用户资料', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated', gender: 'female' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.gender).toBe('female');
      expect(res.body.data.lastName).toBe(newUser.lastName);
    });

    it('PUT /api/auth/profile - 空body返回400', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('PUT /api/auth/settings - 更新通知设置', async () => {
      const res = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notifications: { email: false, push: true },
          dataSharing: { enabled: true },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.email).toBe(false);
      expect(res.body.data.notifications.push).toBe(true);
      expect(res.body.data.dataSharing.enabled).toBe(true);
    });

    it('PUT /api/auth/settings - 空body返回400', async () => {
      const res = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('GET /api/auth/profile - 验证资料已更新', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.gender).toBe('female');
      expect(res.body.data.settings.notifications.email).toBe(false);
    });
  });

  // ============================================================
  // 场景4: 忘记密码 → 重置密码 → 新密码登录
  // ============================================================
  describe('场景4: 密码重置全流程', () => {
    const newPassword = 'NewPass999!';

    it('POST /api/auth/forgot-password - 发送重置token', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: newUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('resetToken');
      resetToken = res.body.resetToken;
      expect(resetToken).toBeDefined();
    });

    it('POST /api/auth/forgot-password - 不存在的邮箱返回404', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
    });

    it('POST /api/auth/reset-password - 使用token重置密码', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: newPassword, confirmPassword: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/reset-password - 重复使用token返回400', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, password: 'AnotherPass1', confirmPassword: 'AnotherPass1' });

      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login - 旧密码登录失败', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: newUser.password });

      expect(res.status).toBe(401);
    });

    it('POST /api/auth/login - 新密码登录成功', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: newUser.email, password: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      accessToken = res.body.data.accessToken;
    });
  });

  // ============================================================
  // 场景5: 登出
  // ============================================================
  describe('场景5: 登出', () => {
    it('POST /api/auth/logout - 成功登出', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBeDefined();
    });

    it('POST /api/auth/logout - 无token返回401', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
