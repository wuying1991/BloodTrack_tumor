import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Dashboard from '../../../pages/dashboard/Dashboard';

import bloodTestService from '../../../services/bloodTest/bloodTestService';
import reminderService from '../../../services/reminder/reminderService';

// Mock bloodTestService
jest.mock('../../../services/bloodTest/bloodTestService', () => ({
  __esModule: true,
  default: {
    getBloodTests: jest.fn(),
  },
}));

// Mock reminderService — 默认空数组，避免每个测试都要显式 mock
jest.mock('../../../services/reminder/reminderService', () => ({
  __esModule: true,
  default: {
    getUpcoming: jest.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

// Mock useAuth
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'test-user-id',
      fullName: '张三',
      email: 'test@example.com',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockBloodTests = [
  {
    _id: '1',
    user: 'test-user-id',
    date: '2024-01-15T00:00:00.000Z',
    wbc: 5.2,
    rbc: 4.5,
    hgb: 140,
    plt: 250,
    neu: 3.0,
    lym: 1.8,
    notes: '化疗后第3天',
    isAbnormal: false,
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
  },
  {
    _id: '2',
    user: 'test-user-id',
    date: '2024-01-08T00:00:00.000Z',
    wbc: 2.5,
    rbc: 3.2,
    hgb: 95,
    plt: 80,
    neu: 1.5,
    lym: 0.8,
    notes: '化疗后第1天',
    isAbnormal: true,
    createdAt: '2024-01-08T00:00:00.000Z',
    updatedAt: '2024-01-08T00:00:00.000Z',
  },
  {
    _id: '3',
    user: 'test-user-id',
    date: '2024-01-01T00:00:00.000Z',
    wbc: 6.0,
    rbc: 4.8,
    hgb: 150,
    plt: 280,
    neu: 4.0,
    lym: 2.0,
    notes: '',
    isAbnormal: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const mockPagination = {
  page: 1,
  limit: 20,
  total: 3,
  pages: 1,
};

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks 也会清掉 jest.mock factory 的默认实现，需要每次重新装
    (reminderService.getUpcoming as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  describe('数据加载状态', () => {
    it('显示加载指示器', () => {
      (bloodTestService.getBloodTests as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      renderDashboard();
      expect(screen.getByText(/加载/i)).toBeInTheDocument();
    });
  });

  describe('有数据时的显示', () => {
    beforeEach(async () => {
      (bloodTestService.getBloodTests as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockBloodTests,
        pagination: mockPagination,
      });
    });

    it('显示总记录数', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('显示最近检查日期', async () => {
      renderDashboard();
      await waitFor(() => {
        const dateElements = screen.getAllByText(/2024/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('显示异常记录数', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('显示快速操作按钮', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/添加记录/)).toBeInTheDocument();
      });
      expect(screen.getByText(/查看全部/)).toBeInTheDocument();
    });

    it('显示最近记录列表标题', async () => {
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/最近记录/)).toBeInTheDocument();
      });
    });

    it('最近记录中显示异常标记', async () => {
      renderDashboard();
      await waitFor(() => {
        const badges = screen.getAllByText('异常');
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('空数据状态', () => {
    it('显示无数据的提示信息', async () => {
      (bloodTestService.getBloodTests as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/暂无血常规数据/)).toBeInTheDocument();
      });
    });

    it('空数据时仍显示快速操作', async () => {
      (bloodTestService.getBloodTests as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      renderDashboard();
      await waitFor(() => {
        const addButtons = screen.getAllByText(/添加记录/);
        expect(addButtons.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('加载失败状态', () => {
    it('显示错误信息', async () => {
      (bloodTestService.getBloodTests as jest.Mock).mockRejectedValueOnce(
        new Error('Network Error')
      );

      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/加载失败/)).toBeInTheDocument();
      });
    });
  });

  describe('即将到期提醒', () => {
    beforeEach(() => {
      (bloodTestService.getBloodTests as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    });

    it('无提醒时显示空态文案', async () => {
      (reminderService.getUpcoming as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
      });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/未来 7 天暂无待办提醒/)).toBeInTheDocument();
      });
    });

    it('有提醒时渲染条目和到期文案', async () => {
      const future = new Date(Date.now() + 86400000 * 2).toISOString();
      (reminderService.getUpcoming as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [
          {
            _id: 'r1',
            user: 'u1',
            title: '复查血常规',
            description: '空腹',
            type: 'blood-test',
            dueDate: future,
            recurrence: 'none',
            enabled: true,
            completed: false,
            notifications: { email: true, push: true },
          },
        ],
      });
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText('复查血常规')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/天后到期|今天到期|明天到期/)
      ).toBeInTheDocument();
    });

    it('提醒接口失败显示错误，不影响主数据', async () => {
      (reminderService.getUpcoming as jest.Mock).mockRejectedValueOnce(
        new Error('Network Error')
      );
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByText(/提醒加载失败/)).toBeInTheDocument();
      });
      // 主数据 (空态) 仍正常展示
      expect(screen.getByText(/暂无血常规数据/)).toBeInTheDocument();
    });
  });
});
