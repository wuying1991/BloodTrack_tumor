/**
 * 集成测试 - 手机号验证码登录（Mock 短信）
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.SMS_FIXED_CODE = '123456';
process.env.SMS_PROVIDER = 'fixed';

import app from '../../app';
import { User } from '../../models/User';
import { SmsCode } from '../../models/SmsCode';

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

afterEach(async () => {
  await User.deleteMany({});
  await SmsCode.deleteMany({});
});

const phone = '13800138000';

describe('手机号验证码登录', () => {
  it('POST /api/auth/sms/send - 发送验证码并返回 devCode（非 production）', async () => {
    const res = await request(app)
      .post('/api/auth/sms/send')
      .send({ phone, purpose: 'login' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expiresIn).toBe(300);
    expect(res.body.data.cooldown).toBe(60);
    expect(res.body.data.devCode).toBe('123456');

    const stored = await SmsCode.findOne({ phone });
    expect(stored).toBeTruthy();
  });

  it('POST /api/auth/sms/send - 冷却期内再次发送返回 400', async () => {
    await request(app).post('/api/auth/sms/send').send({ phone });
    const res = await request(app).post('/api/auth/sms/send').send({ phone });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SMS_COOLDOWN');
  });

  it('POST /api/auth/sms/send - 非法手机号', async () => {
    const res = await request(app)
      .post('/api/auth/sms/send')
      .send({ phone: '12345' });
    // validation middleware uses 422 for field validation failures
    expect([400, 422]).toContain(res.status);
  });

  it('POST /api/auth/sms/login - 新用户自动注册并签发 JWT', async () => {
    await request(app).post('/api/auth/sms/send').send({ phone });

    const res = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456', fullName: '手机用户' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.phone).toBe(phone);
    expect(res.body.data.fullName).toBe('手机用户');
    expect(res.body.data.email).toBeUndefined();

    const user = await User.findOne({ phone });
    expect(user).toBeTruthy();
    expect(user!.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/sms/login - 已有用户再次登录返回 200', async () => {
    await request(app).post('/api/auth/sms/send').send({ phone });
    await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });

    // 冷却：直接插入新码（绕过 60s）
    await SmsCode.deleteMany({});
    await request(app).post('/api/auth/sms/send').send({ phone: '13900139000' });
    // use same fixed code after clearing and re-send for original phone with forced create via service
    // Clear cooldown by deleting codes and using a fresh send after manipulating createdAt
    await SmsCode.deleteMany({});
    const bcrypt = require('bcryptjs');
    await SmsCode.create({
      phone,
      codeHash: await bcrypt.hash('123456', 10),
      purpose: 'login',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    const res = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe(phone);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/sms/login - 错误验证码', async () => {
    await request(app).post('/api/auth/sms/send').send({ phone });
    const res = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '000000' });
    expect(res.status).toBe(401);
  });

  it('手机号登录后可用 accessToken 访问 profile', async () => {
    await request(app).post('/api/auth/sms/send').send({ phone });
    const login = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });

    const token = login.body.data.accessToken;
    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profile.status).toBe(200);
    expect(profile.body.data.phone).toBe(phone);
  });

  it('邮箱登录与手机号登录互不影响', async () => {
    const emailUser = {
      email: 'email-user@example.com',
      password: 'Test1234',
      fullName: 'Email User',
    };
    await request(app).post('/api/auth/register').send(emailUser);

    await request(app).post('/api/auth/sms/send').send({ phone });
    const sms = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });

    const emailLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: emailUser.email, password: emailUser.password });

    expect(sms.body.data._id).not.toBe(emailLogin.body.data._id);
    expect(await User.countDocuments()).toBe(2);
  });
});
