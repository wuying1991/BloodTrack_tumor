import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Login from '../Login';
import authService from '../../../services/auth/authService';
import { ApiError } from '../../../services/api/apiClient';

// 锁定 useNavigate 以验证跳转目标
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
    login: jest.fn(),
  },
}));

const renderLogin = (initialEntries: string[] = ['/login']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Login />
    </MemoryRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染', () => {
    it('显示标题、邮箱、密码输入和提交按钮', () => {
      renderLogin();
      expect(screen.getByRole('heading', { name: '登录' })).toBeInTheDocument();
      expect(screen.getByLabelText('电子邮箱')).toBeInTheDocument();
      expect(screen.getByLabelText('密码')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('未带 expired 参数时不显示会话过期提示', () => {
      renderLogin();
      expect(screen.queryByText(/会话已过期/)).not.toBeInTheDocument();
    });

    it('?expired=1 时显示会话过期提示', () => {
      renderLogin(['/login?expired=1']);
      expect(screen.getByText(/会话已过期/)).toBeInTheDocument();
    });
  });

  describe('提交流程', () => {
    it('成功登录后调用 login 并跳转到 /dashboard', async () => {
      (authService.login as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          _id: 'u1',
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
        },
      });
      renderLogin();
      await userEvent.type(screen.getByLabelText('电子邮箱'), 'a@b.com');
      await userEvent.type(screen.getByLabelText('密码'), 'Pass123!');
      await userEvent.click(screen.getByRole('button', { name: '登录' }));

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'a@b.com',
          password: 'Pass123!',
        });
      });
      expect(mockLogin).toHaveBeenCalledWith(
        'access-1',
        'refresh-1',
        expect.objectContaining({ _id: 'u1', email: 'a@b.com' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('ApiError 时显示后端返回的 message', async () => {
      (authService.login as jest.Mock).mockRejectedValueOnce(
        new ApiError(401, '邮箱或密码错误')
      );
      renderLogin();
      await userEvent.type(screen.getByLabelText('电子邮箱'), 'a@b.com');
      await userEvent.type(screen.getByLabelText('密码'), 'wrong');
      await userEvent.click(screen.getByRole('button', { name: '登录' }));

      await waitFor(() => {
        expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('未知错误时显示通用错误提示', async () => {
      (authService.login as jest.Mock).mockRejectedValueOnce(
        new Error('Network down')
      );
      renderLogin();
      await userEvent.type(screen.getByLabelText('电子邮箱'), 'a@b.com');
      await userEvent.type(screen.getByLabelText('密码'), 'Pass123!');
      await userEvent.click(screen.getByRole('button', { name: '登录' }));

      await waitFor(() => {
        expect(screen.getByText(/登录失败/)).toBeInTheDocument();
      });
    });

    it('提交期间禁用按钮并显示 loading 文本', async () => {
      let resolveLogin: (v: unknown) => void = () => {};
      (authService.login as jest.Mock).mockReturnValueOnce(
        new Promise(resolve => {
          resolveLogin = resolve;
        })
      );
      renderLogin();
      await userEvent.type(screen.getByLabelText('电子邮箱'), 'a@b.com');
      await userEvent.type(screen.getByLabelText('密码'), 'Pass123!');
      await userEvent.click(screen.getByRole('button', { name: '登录' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /登录中/ })).toBeDisabled();
      });

      // 解开 promise 让 useEffect cleanup 不报警
      resolveLogin({ success: false });
    });
  });
});
