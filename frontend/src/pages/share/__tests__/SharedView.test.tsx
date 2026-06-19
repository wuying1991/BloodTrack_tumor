import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedView from '../SharedView';
import publicShareService from '../../../services/share/publicShareService';
import { PublicApiError } from '../../../services/share/publicApiClient';

jest.mock('../../../services/share/publicShareService', () => ({
  __esModule: true,
  default: {
    getMeta: jest.fn(),
    verifyPin: jest.fn(),
    getBloodTests: jest.fn(),
    getChemoCycles: jest.fn(),
    getAnalytics: jest.fn(),
  },
}));

const mocked = publicShareService as jest.Mocked<typeof publicShareService>;

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <Routes>
        <Route path="/share/:token" element={<SharedView />} />
        <Route path="/share/not-found" element={<div>NOT_FOUND_PAGE</div>} />
        <Route path="/share/:token/expired" element={<div>EXPIRED_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
});

describe('SharedView', () => {
  it('无 PIN 链接：直接显示数据', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: false,
      },
    });
    mocked.getBloodTests.mockResolvedValue({
      success: true,
      data: [
        {
          _id: 'b1',
          date: '2026-06-01',
          wbc: 5,
          rbc: 4.5,
          hgb: 130,
          plt: 200,
          isAbnormal: false,
        },
      ],
    });

    renderAt('aabb');

    await waitFor(() => {
      expect(screen.getByText(/张 三 的健康数据/)).toBeInTheDocument();
    });
    expect(screen.getByText('血常规记录')).toBeInTheDocument();
    expect(screen.queryByText('化疗周期')).not.toBeInTheDocument();
  });

  it('有 PIN 链接：先显示 PIN 表单', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: true,
      },
    });
    renderAt('cc');
    await waitFor(() => {
      expect(screen.getByText(/请输入访问密码/)).toBeInTheDocument();
    });
    expect(mocked.getBloodTests).not.toHaveBeenCalled();
  });

  it('PIN 输入正确后加载数据', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: true,
      },
    });
    mocked.verifyPin.mockResolvedValue({ success: true, message: 'ok' });
    mocked.getBloodTests.mockResolvedValue({ success: true, data: [] });

    renderAt('dd');
    await waitFor(() => {
      expect(screen.getByText(/请输入访问密码/)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '4321' },
    });
    fireEvent.click(screen.getByRole('button', { name: /查看/ }));

    await waitFor(() => {
      expect(screen.getByText(/张 三 的健康数据/)).toBeInTheDocument();
    });
    expect(mocked.verifyPin).toHaveBeenCalledWith('dd', '4321');
    expect(sessionStorage.getItem('share-pin-dd')).toBe('4321');
  });

  it('PIN 错误显示提示', async () => {
    mocked.getMeta.mockResolvedValue({
      success: true,
      data: {
        ownerName: '张 三',
        scope: { bloodTests: true, chemoCycles: false, analytics: false },
        expiresAt: null,
        requiresPin: true,
      },
    });
    mocked.verifyPin.mockRejectedValue(new PublicApiError(401, 'wrong'));

    renderAt('ee');
    await waitFor(() => {
      expect(screen.getByText(/请输入访问密码/)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '0000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /查看/ }));

    await waitFor(() => {
      expect(screen.getByText(/密码错误/)).toBeInTheDocument();
    });
  });

  it('404 跳到 not-found 页', async () => {
    mocked.getMeta.mockRejectedValue(new PublicApiError(404, 'not found'));
    renderAt('ff');
    await waitFor(() => {
      expect(screen.getByText('NOT_FOUND_PAGE')).toBeInTheDocument();
    });
  });

  it('410 跳到 expired 页', async () => {
    mocked.getMeta.mockRejectedValue(new PublicApiError(410, 'expired'));
    renderAt('gg');
    await waitFor(() => {
      expect(screen.getByText('EXPIRED_PAGE')).toBeInTheDocument();
    });
  });
});
