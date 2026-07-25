/**
 * 统一账号：邮箱/手机互通、绑定、密码登录
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

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

async function plantSms(phone: string, purpose: 'login' | 'bind' = 'login') {
  await SmsCode.create({
    phone,
    codeHash: await bcrypt.hash('123456', 10),
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
  });
}

describe('统一账号互通', () => {
  it('手机验证码注册 → 设置密码 → 手机号+密码登录', async () => {
    const phone = '13800138001';
    await plantSms(phone, 'login');
    const sms = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456', fullName: '手机用户' });
    expect(sms.status).toBe(201);
    const token = sms.body.data.accessToken;
    expect(sms.body.data.hasPassword).toBe(false);
    expect(sms.body.data.methods.phoneSms).toBe(true);
    expect(sms.body.data.methods.phonePassword).toBe(false);

    const setPw = await request(app)
      .post('/api/auth/password/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Test1234', confirmPassword: 'Test1234' });
    expect(setPw.status).toBe(200);
    expect(setPw.body.data.hasPassword).toBe(true);
    expect(setPw.body.data.methods.phonePassword).toBe(true);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phone, password: 'Test1234' });
    expect(login.status).toBe(200);
    expect(login.body.data.phone).toBe(phone);
    expect(login.body.data.accessToken).toBeDefined();

    // account field also works
    const login2 = await request(app)
      .post('/api/auth/login')
      .send({ account: phone, password: 'Test1234' });
    expect(login2.status).toBe(200);
  });

  it('手机账号绑定邮箱后可用邮箱+密码登录', async () => {
    const phone = '13800138002';
    await plantSms(phone, 'login');
    const sms = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });
    const token = sms.body.data.accessToken;

    const bind = await request(app)
      .post('/api/auth/email/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'phone-user@example.com', password: 'Test1234' });
    expect(bind.status).toBe(200);
    expect(bind.body.data.email).toBe('phone-user@example.com');
    expect(bind.body.data.hasPassword).toBe(true);
    expect(bind.body.data.methods.emailPassword).toBe(true);
    expect(bind.body.data.methods.phonePassword).toBe(true);

    const byEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'phone-user@example.com', password: 'Test1234' });
    expect(byEmail.status).toBe(200);
    expect(byEmail.body.data.phone).toBe(phone);

    const byPhone = await request(app)
      .post('/api/auth/login')
      .send({ phone, password: 'Test1234' });
    expect(byPhone.status).toBe(200);
    expect(byPhone.body.data.email).toBe('phone-user@example.com');
  });

  it('邮箱注册后绑定手机，可用验证码或手机密码登录', async () => {
    const email = 'email-first@example.com';
    const password = 'Test1234';
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email, password, fullName: '邮箱用户' });
    expect(reg.status).toBe(201);
    const token = reg.body.data.accessToken;

    const phone = '13800138003';
    await plantSms(phone, 'bind');
    const bind = await request(app)
      .post('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone, code: '123456' });
    expect(bind.status).toBe(200);
    expect(bind.body.data.phone).toBe(phone);
    expect(bind.body.data.methods.phoneSms).toBe(true);
    expect(bind.body.data.methods.phonePassword).toBe(true);

    const phonePw = await request(app)
      .post('/api/auth/login')
      .send({ phone, password });
    expect(phonePw.status).toBe(200);
    expect(phonePw.body.data.email).toBe(email);

    await plantSms(phone, 'login');
    const smsLogin = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });
    expect(smsLogin.status).toBe(200);
    expect(smsLogin.body.data.email).toBe(email);
    // same user, not a new registration
    expect(smsLogin.body.data._id).toBe(reg.body.data._id);
  });

  it('绑定他人已用手机号失败', async () => {
    const phone = '13800138004';
    await plantSms(phone, 'login');
    await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });

    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'other@example.com',
        password: 'Test1234',
        fullName: 'Other',
      });
    const token = reg.body.data.accessToken;

    await plantSms(phone, 'bind');
    const bind = await request(app)
      .post('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone, code: '123456' });
    expect(bind.status).toBe(409);
    expect(bind.body.code).toBe('PHONE_ALREADY_BOUND');
  });

  it('GET /identities 返回可用登录方式', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'id@example.com',
        password: 'Test1234',
        fullName: 'ID User',
      });
    const token = reg.body.data.accessToken;
    const res = await request(app)
      .get('/api/auth/identities')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.hasPassword).toBe(true);
    expect(res.body.data.methods.emailPassword).toBe(true);
    expect(res.body.data.methods.phoneSms).toBe(false);
  });

  it('未设密码时手机号+密码登录失败', async () => {
    const phone = '13800138005';
    await plantSms(phone, 'login');
    await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone, password: 'Test1234' });
    expect(res.status).toBe(401);
  });

  it('换绑手机号（密码证明）', async () => {
    const phone1 = '13800138006';
    const phone2 = '13800138007';
    await plantSms(phone1, 'login');
    const sms = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone: phone1, code: '123456' });
    const token = sms.body.data.accessToken;

    await request(app)
      .post('/api/auth/email/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'rebind@example.com', password: 'Test1234' });

    await plantSms(phone2, 'bind');
    const rebind = await request(app)
      .post('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: phone2, code: '123456', currentPassword: 'Test1234' });
    expect(rebind.status).toBe(200);
    expect(rebind.body.data.phone).toBe(phone2);

    await plantSms(phone2, 'login');
    const loginNew = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone: phone2, code: '123456' });
    expect(loginNew.status).toBe(200);
    expect(loginNew.body.data._id).toBe(sms.body.data._id);

    // old phone no longer linked — creates a new user if used
    await plantSms(phone1, 'login');
    const loginOld = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone: phone1, code: '123456' });
    expect(loginOld.body.data._id).not.toBe(sms.body.data._id);
  });

  it('解绑手机 / 解绑邮箱 + 禁止解绑最后登录方式', async () => {
    const phone = '13800138008';
    await plantSms(phone, 'login');
    const sms = await request(app)
      .post('/api/auth/sms/login')
      .send({ phone, code: '123456' });
    const token = sms.body.data.accessToken;

    // only phone → cannot unbind
    const bad = await request(app)
      .delete('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'x' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('CANNOT_UNBIND_LAST_METHOD');

    await request(app)
      .post('/api/auth/email/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'unbind@example.com', password: 'Test1234' });

    const unbindPhoneRes = await request(app)
      .delete('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Test1234' });
    expect(unbindPhoneRes.status).toBe(200);
    expect(unbindPhoneRes.body.data.phone).toBeFalsy();
    expect(unbindPhoneRes.body.data.canUnbindPhone).toBe(false);
    expect(unbindPhoneRes.body.data.canUnbindEmail).toBe(false);

    // only email left → cannot unbind email
    const badEmail = await request(app)
      .delete('/api/auth/email/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Test1234' });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.code).toBe('CANNOT_UNBIND_LAST_METHOD');

    // re-bind phone then unbind email
    await plantSms(phone, 'bind');
    await request(app)
      .post('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone, code: '123456' });

    const unbindEmailRes = await request(app)
      .delete('/api/auth/email/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Test1234' });
    expect(unbindEmailRes.status).toBe(200);
    expect(unbindEmailRes.body.data.email).toBeFalsy();
    expect(unbindEmailRes.body.data.phone).toBe(phone);
  });

  it('换绑邮箱', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'old-mail@example.com',
        password: 'Test1234',
        fullName: 'Mail User',
      });
    const token = reg.body.data.accessToken;
    const phone = '13800138009';
    await plantSms(phone, 'bind');
    await request(app)
      .post('/api/auth/phone/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone, code: '123456' });

    const rebind = await request(app)
      .post('/api/auth/email/bind')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'new-mail@example.com',
        currentPassword: 'Test1234',
      });
    expect(rebind.status).toBe(200);
    expect(rebind.body.data.email).toBe('new-mail@example.com');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'new-mail@example.com', password: 'Test1234' });
    expect(login.status).toBe(200);
  });
});
