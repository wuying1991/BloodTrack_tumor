import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Settings from '../Settings';
import authService from '../../../services/auth/authService';
import shareService from '../../../services/share/shareService';
import { ApiError } from '../../../services/api/apiClient';

const mockLogout = jest.fn();
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);

// 必须用稳定引用，否则 Settings 的 useEffect([user]) 会无限循环重置状态
const mockUser = {
  _id: 'u1',
  email: 'a@b.com',
  fullName: '张三',
  gender: 'male',
  dateOfBirth: '1990-01-01T00:00:00.000Z',
  settings: {
    notifications: { email: true, push: false },
    dataSharing: { enabled: false },
  },
};

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
  }),
}));

jest.mock('../../../services/auth/authService', () => ({
  __esModule: true,
  default: {
    updateProfile: jest.fn(),
    updateSettings: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

jest.mock('../../../services/share/shareService', () => ({
  __esModule: true,
  default: {
    listShares: jest.fn().mockResolvedValue({ success: true, data: [] }),
    createShare: jest.fn(),
    deleteShare: jest.fn(),
  },
}));

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('个人资料', () => {
    it('用 user 字段预填表单，邮箱只读', () => {
      render(<Settings />);
      expect(screen.getByDisplayValue('a@b.com')).toBeDisabled();
      expect(screen.getByDisplayValue('张三')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1990-01-01')).toBeInTheDocument();
    });

    it('保存调用 updateProfile + refreshUser', async () => {
      (authService.updateProfile as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '保存个人资料' })
      );
      await waitFor(() => {
        expect(authService.updateProfile).toHaveBeenCalledWith({
          fullName: '张三',
          gender: 'male',
          dateOfBirth: '1990-01-01',
        });
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(await screen.findByText('个人资料已更新')).toBeInTheDocument();
    });

    it('保存失败时显示错误 toast', async () => {
      (authService.updateProfile as jest.Mock).mockRejectedValueOnce(
        new ApiError(500, 'oops')
      );
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '保存个人资料' })
      );
      expect(await screen.findByText('更新失败，请重试')).toBeInTheDocument();
    });
  });

  describe('Tab 切换', () => {
    it('切到通知 tab 后保存通知设置', async () => {
      (authService.updateSettings as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: /通知设置/ }));
      await userEvent.click(
        screen.getByRole('button', { name: '保存通知设置' })
      );
      await waitFor(() => {
        expect(authService.updateSettings).toHaveBeenCalledWith({
          notifications: { email: true, push: false },
        });
      });
    });

    it('切到数据 tab 后保存数据共享', async () => {
      (authService.updateSettings as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {},
      });
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: /数据与隐私/ }));
      await userEvent.click(
        screen.getByRole('button', { name: '保存共享设置' })
      );
      await waitFor(() => {
        expect(authService.updateSettings).toHaveBeenCalledWith({
          dataSharing: { enabled: false },
        });
      });
    });
  });

  describe('修改密码', () => {
    const fillPasswordForm = async (
      cur: string,
      next: string,
      confirm: string
    ) => {
      // Settings 页里 label 没有 htmlFor，靠位置取 input
      const form = screen
        .getByRole('button', { name: '确认修改' })
        .closest('form') as HTMLElement;
      const inputs = form.querySelectorAll('input[type="password"]');
      await userEvent.type(inputs[0] as HTMLElement, cur);
      await userEvent.type(inputs[1] as HTMLElement, next);
      await userEvent.type(inputs[2] as HTMLElement, confirm);
    };

    it('点击 "修改密码" 展开内嵌表单，再次点击关闭', async () => {
      render(<Settings />);
      const toggle = screen.getByRole('button', { name: '修改密码' });
      await userEvent.click(toggle);
      // 展开后能找到 "确认修改" 按钮 = 表单已渲染
      expect(
        screen.getByRole('button', { name: '确认修改' })
      ).toBeInTheDocument();
      await userEvent.click(
        screen.getByRole('button', { name: '取消修改密码' })
      );
      expect(
        screen.queryByRole('button', { name: '确认修改' })
      ).not.toBeInTheDocument();
    });

    it('两次新密码不一致时不调用接口', async () => {
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: '修改密码' }));
      await fillPasswordForm('OldPass1!', 'NewPass1!', 'Different1!');
      await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
      expect(
        await screen.findByText('两次输入的新密码不一致')
      ).toBeInTheDocument();
      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('新密码强度不足时不调用接口', async () => {
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: '修改密码' }));
      await fillPasswordForm('OldPass1!', 'weak', 'weak');
      await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
      expect(
        await screen.findByText('新密码至少需要6个字符')
      ).toBeInTheDocument();
      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('新密码缺少大小写/数字时不调用接口', async () => {
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: '修改密码' }));
      await fillPasswordForm('OldPass1!', 'alllowercase', 'alllowercase');
      await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
      expect(
        await screen.findByText('新密码必须包含大小写字母和数字')
      ).toBeInTheDocument();
      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('新旧密码相同时不调用接口', async () => {
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: '修改密码' }));
      await fillPasswordForm('SamePass1!', 'SamePass1!', 'SamePass1!');
      await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
      expect(
        await screen.findByText('新密码不能与当前密码相同')
      ).toBeInTheDocument();
      expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('成功修改密码后关闭表单并显示 toast', async () => {
      (authService.changePassword as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'ok',
      });
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: '修改密码' }));
      await fillPasswordForm('OldPass1!', 'NewPass1!', 'NewPass1!');
      await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
      await waitFor(() => {
        expect(authService.changePassword).toHaveBeenCalledWith({
          currentPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
          confirmPassword: 'NewPass1!',
        });
      });
      expect(await screen.findByText('密码已成功修改')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: '确认修改' })
      ).not.toBeInTheDocument();
    });

    it('后端返回 ApiError 时显示后端 message', async () => {
      (authService.changePassword as jest.Mock).mockRejectedValueOnce(
        new ApiError(401, '当前密码不正确')
      );
      render(<Settings />);
      await userEvent.click(screen.getByRole('button', { name: '修改密码' }));
      await fillPasswordForm('WrongOld1!', 'NewPass1!', 'NewPass1!');
      await userEvent.click(screen.getByRole('button', { name: '确认修改' }));
      expect(await screen.findByText('当前密码不正确')).toBeInTheDocument();
    });
  });

  it('退出登录调用 logout', async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole('button', { name: '退出登录' }));
    expect(mockLogout).toHaveBeenCalled();
  });

  describe('删除账户', () => {
    it('点击 "删除我的账户" 展开确认表单', async () => {
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '删除我的账户' })
      );
      expect(
        screen.getByRole('button', { name: '确认删除账户' })
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('输入密码确认')).toBeInTheDocument();
    });

    it('取消按钮关闭确认表单并清空输入', async () => {
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '删除我的账户' })
      );
      const input = screen.getByPlaceholderText('输入密码确认');
      await userEvent.type(input, 'somepassword');
      await userEvent.click(screen.getByRole('button', { name: '取消' }));
      expect(
        screen.queryByRole('button', { name: '确认删除账户' })
      ).not.toBeInTheDocument();
    });

    it('未输入密码直接提交显示校验文案', async () => {
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '删除我的账户' })
      );
      await userEvent.click(
        screen.getByRole('button', { name: '确认删除账户' })
      );
      expect(
        await screen.findByText('请输入密码以确认操作')
      ).toBeInTheDocument();
      expect(authService.deleteAccount).not.toHaveBeenCalled();
    });

    it('密码正确 → 调用 deleteAccount + logout', async () => {
      (authService.deleteAccount as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: { bloodTests: 3, chemoCycles: 1, reminders: 2 },
      });
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '删除我的账户' })
      );
      await userEvent.type(
        screen.getByPlaceholderText('输入密码确认'),
        'MyPass123!'
      );
      await userEvent.click(
        screen.getByRole('button', { name: '确认删除账户' })
      );
      await waitFor(() => {
        expect(authService.deleteAccount).toHaveBeenCalledWith('MyPass123!');
      });
      // 删除成功后应调 logout
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    it('后端返回 ApiError 时显示 message 且不登出', async () => {
      (authService.deleteAccount as jest.Mock).mockRejectedValueOnce(
        new ApiError(401, '密码不正确')
      );
      render(<Settings />);
      await userEvent.click(
        screen.getByRole('button', { name: '删除我的账户' })
      );
      await userEvent.type(
        screen.getByPlaceholderText('输入密码确认'),
        'WrongPass!'
      );
      await userEvent.click(
        screen.getByRole('button', { name: '确认删除账户' })
      );
      expect(await screen.findByText('密码不正确')).toBeInTheDocument();
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });

  describe('我的分享 (M-P4)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // 重新设置 listShares 的默认返回（clearAllMocks 会清理）
      (shareService.listShares as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });
    });

    it('总开关关闭时创建按钮 disabled', async () => {
      // 默认 mockUser 的 dataSharing.enabled = false
      render(<Settings />);
      // 切到 "数据与隐私" tab
      const dataTabBtn = screen.getByRole('button', { name: /数据与隐私/ });
      fireEvent.click(dataTabBtn);

      // 等加载完成或空列表渲染
      const createBtn = await screen.findByRole('button', {
        name: /创建分享链接/,
      });
      expect(createBtn).toBeDisabled();
    });
  });
});
