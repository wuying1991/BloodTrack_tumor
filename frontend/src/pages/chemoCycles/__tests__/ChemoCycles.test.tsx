import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ChemoCycles from '../ChemoCycles';

import chemoCycleService from '../../../services/chemoCycle/chemoCycleService';

jest.mock('../../../services/chemoCycle/chemoCycleService', () => ({
  __esModule: true,
  default: {
    getChemoCycles: jest.fn(),
    getChemoCycleById: jest.fn(),
    createChemoCycle: jest.fn(),
    updateChemoCycle: jest.fn(),
    deleteChemoCycle: jest.fn(),
    convertFormToApiData: jest.fn(),
    convertApiToFormData: jest.fn(),
  },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'test-user-id',
      fullName: '张三',
      email: 'test@example.com',
    },
    isAuthenticated: true,
  }),
}));

const mockCycles = [
  {
    _id: '1',
    user: 'test-user-id',
    startDate: '2024-03-01T00:00:00.000Z',
    endDate: '2024-05-01T00:00:00.000Z',
    medications: [
      { name: '环磷酰胺', dosage: '500mg', schedule: '每3周一次' },
      { name: '多柔比星', dosage: '50mg', schedule: '每3周一次' },
    ],
    doctorNotes: '第一期化疗方案',
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
  },
  {
    _id: '2',
    user: 'test-user-id',
    startDate: '2024-06-01T00:00:00.000Z',
    endDate: '2024-08-01T00:00:00.000Z',
    medications: [{ name: '紫杉醇', dosage: '175mg', schedule: '每3周一次' }],
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  },
];

const renderChemoCycles = () => {
  return render(
    <BrowserRouter>
      <ChemoCycles />
    </BrowserRouter>
  );
};

describe('ChemoCycles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('数据加载状态', () => {
    it('显示加载指示器', () => {
      (chemoCycleService.getChemoCycles as jest.Mock).mockReturnValue(
        new Promise<void>(() => {
          /* never resolves to keep loading state */
        })
      );

      renderChemoCycles();
      expect(screen.getByText(/加载/i)).toBeInTheDocument();
    });

    it('加载失败时显示错误信息', async () => {
      (chemoCycleService.getChemoCycles as jest.Mock).mockRejectedValueOnce(
        new Error('Network Error')
      );

      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/加载失败/i)).toBeInTheDocument();
      });
    });

    it('加载失败时可重试', async () => {
      (chemoCycleService.getChemoCycles as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        });

      renderChemoCycles();
      await waitFor(() => {
        const retryBtn = screen.getByRole('button', { name: /重试/ });
        expect(retryBtn).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /重试/ }));
      expect(chemoCycleService.getChemoCycles).toHaveBeenCalledTimes(2);
    });
  });

  describe('空数据状态', () => {
    it('显示空数据提示', async () => {
      (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/暂无化疗周期/i)).toBeInTheDocument();
      });
    });

    it('空数据时显示添加按钮', async () => {
      (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });

      renderChemoCycles();
      await waitFor(() => {
        const addBtns = screen.getAllByText(/添加周期/);
        expect(addBtns.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('有数据时的列表显示', () => {
    beforeEach(async () => {
      (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockCycles,
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
      });
    });

    it('显示周期列表', async () => {
      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/环磷酰胺/)).toBeInTheDocument();
      });
      expect(screen.getByText(/多柔比星/)).toBeInTheDocument();
      expect(screen.getByText(/紫杉醇/)).toBeInTheDocument();
    });

    it('显示日期信息', async () => {
      renderChemoCycles();
      await waitFor(() => {
        const dateElements = screen.getAllByText(/2024/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });

    it('显示操作按钮', async () => {
      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getAllByText(/编辑/).length).toBe(2);
      });
      expect(screen.getAllByText(/删除/).length).toBe(2);
    });

    it('点击添加按钮切换到添加模式', async () => {
      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/添加周期/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/添加周期/));
      await waitFor(() => {
        expect(screen.getByText(/保存/)).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText(/药物名称/)).toBeInTheDocument();
    });

    it('点击编辑按钮切换到编辑模式', async () => {
      (chemoCycleService.getChemoCycleById as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockCycles[0],
      });
      (chemoCycleService.convertApiToFormData as jest.Mock).mockReturnValueOnce(
        {
          startDate: '2024-03-01',
          endDate: '2024-05-01',
          medications: mockCycles[0].medications,
          doctorNotes: '第一期化疗方案',
        }
      );

      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/环磷酰胺/)).toBeInTheDocument();
      });

      userEvent.click(screen.getAllByText(/编辑/)[0]);

      await waitFor(() => {
        const titles = screen.getAllByText(/更新周期/);
        expect(titles.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('点击删除按钮弹出确认并删除', async () => {
      window.confirm = jest.fn(() => true);
      (chemoCycleService.deleteChemoCycle as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: '已删除',
      });
      (chemoCycleService.getChemoCycles as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [mockCycles[1]],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/环磷酰胺/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText(/删除/)[0]);
      expect(window.confirm).toHaveBeenCalled();
      expect(chemoCycleService.deleteChemoCycle).toHaveBeenCalledWith('1');
    });

    it('添加药物的按钮可增加药物项', async () => {
      renderChemoCycles();
      await waitFor(() => {
        expect(screen.getByText(/添加周期/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/添加周期/));
      await waitFor(() => {
        expect(screen.getByText(/添加药物/)).toBeInTheDocument();
      });

      const addMedBtns = screen.getAllByText(/添加药物/);
      fireEvent.click(addMedBtns[0]);
      await waitFor(() => {
        const nameInputs = screen.getAllByPlaceholderText(/药物名称/);
        expect(nameInputs.length).toBe(2);
      });
    });
  });
});
