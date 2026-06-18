import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Register from '../Register';
import authService from '../../../services/auth/authService';
import { ApiError } from '../../../services/api/apiClient';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockLogin = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('../../../services/auth/authService', () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
  },
}));

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

const fillForm = async (overrides: Partial<Record<string, string>> = {}) => {
  const values = {
    firstName: '三',
    lastName: '张',
    email: 'a@b.com',
    password: 'Pass123!',
    confirmPassword: 'Pass123!',
    ...overrides,
  };
  await userEvent.type(screen.getByLabelText('名字'), values.firstName);
  await userEvent.type(screen.getByLabelText('姓氏'), values.lastName);
  await userEvent.type(screen.getByLabelText('电子邮箱'), values.email);
  await userEvent.type(screen.getByLabelText('密码'), values.password);
  await userEvent.type(
    screen.getByLabelText('确认密码'),
    values.confirmPassword
  );
};

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('渲染所有字段', () => {
    renderRegister();
    expect(screen.getByLabelText('名字')).toBeInTheDocument();
    expect(screen.getByLabelText('姓氏')).toBeInTheDocument();
    expect(screen.getByLabelText('电子邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();
  });

  it('两次密码不一致时阻止提交并显示字段错误', async () => {
    renderRegister();
    await fillForm({ confirmPassword: 'Different1!' });
    await userEvent.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(screen.getByText(/两次输入的密码不一致/)).toBeInTheDocument();
    });
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('成功注册后调用 login 并跳 /dashboard', async () => {
    (authService.register as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        accessToken: 'a',
        refreshToken: 'r',
        _id: 'u1',
        email: 'a@b.com',
        firstName: '三',
        lastName: '张',
      },
    });
    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'Pass123!',
        firstName: '三',
        lastName: '张',
      });
    });
    expect(mockLogin).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('后端返回字段错误时挂到对应输入旁', async () => {
    const err = new ApiError(422, '参数错误', { email: '邮箱已被使用' });
    (authService.register as jest.Mock).mockRejectedValueOnce(err);

    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(screen.getByText('邮箱已被使用')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('未知错误时显示通用提示', async () => {
    (authService.register as jest.Mock).mockRejectedValueOnce(
      new Error('boom')
    );
    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(screen.getByText(/注册失败/)).toBeInTheDocument();
    });
  });
});
