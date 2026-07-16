import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import { ApiError } from '../../services/api/apiClient';
import SharesSection from './components/SharesSection';
import AuditLogSection from './components/AuditLogSection';
import './Settings.css';

const Settings: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'notifications' | 'data' | 'security'
  >('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const [formFullName, setFormFullName] = useState(user?.fullName || '');
  const [formGender, setFormGender] = useState(user?.gender || '');
  const [formDateOfBirth, setFormDateOfBirth] = useState(
    user?.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().split('T')[0]
      : ''
  );

  const [notifications, setNotifications] = useState({
    email: user?.settings?.notifications?.email ?? true,
    push: user?.settings?.notifications?.push ?? true,
  });

  const [dataSharing, setDataSharing] = useState({
    enabled: user?.settings?.dataSharing?.enabled ?? false,
  });

  // 修改密码内嵌表单状态
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 删除账户确认流
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      setFormFullName(user.fullName || '');
      setFormGender(user.gender || '');
      setFormDateOfBirth(
        user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split('T')[0]
          : ''
      );
      setNotifications({
        email: user.settings?.notifications?.email ?? true,
        push: user.settings?.notifications?.push ?? true,
      });
      setDataSharing({
        enabled: user.settings?.dataSharing?.enabled ?? false,
      });
    }
  }, [user]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setSaveError(msg);
      setTimeout(() => setSaveError(''), 3000);
    } else {
      setSaveMessage(msg);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      await authService.updateProfile({
        fullName: formFullName,
        gender: formGender || undefined,
        dateOfBirth: formDateOfBirth || undefined,
      });
      await refreshUser();
      showToast('个人资料已更新');
    } catch {
      showToast('更新失败，请重试', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    setIsSaving(true);
    try {
      await authService.updateSettings({
        notifications: { email: notifications.email, push: notifications.push },
      });
      await refreshUser();
      showToast('通知设置已保存');
    } catch {
      showToast('保存失败，请重试', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataSharingSave = async () => {
    setIsSaving(true);
    try {
      await authService.updateSettings({
        dataSharing: { enabled: dataSharing.enabled },
      });
      await refreshUser();
      showToast('数据共享设置已保存');
    } catch {
      showToast('保存失败，请重试', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // 客户端预校验，与后端一致
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('新密码至少需要6个字符');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      setPasswordError('新密码必须包含大小写字母和数字');
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError('新密码不能与当前密码相同');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(passwordForm);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordForm(false);
      showToast('密码已成功修改');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPasswordError(err.message || '修改失败');
      } else {
        setPasswordError('修改失败，请重试');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const cancelPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordError('');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('请输入密码以确认操作');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount(deletePassword);
      // 删除成功后强制登出
      await logout();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || '删除失败');
      } else {
        setDeleteError('删除失败，请重试');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>设置</h1>
      </div>

      {saveMessage && <div className="save-message success">{saveMessage}</div>}
      {saveError && <div className="save-message error">{saveError}</div>}

      <div className="settings-container">
        <nav className="settings-tabs">
          <button
            className={`settings-tab ${
              activeTab === 'profile' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('profile')}
          >
            👤 个人资料
          </button>
          <button
            className={`settings-tab ${
              activeTab === 'notifications' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 通知设置
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            🔒 数据与隐私
          </button>
          <button
            className={`settings-tab ${
              activeTab === 'security' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('security')}
          >
            🛡️ 安全日志
          </button>
        </nav>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>个人资料</h3>

              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-readonly"
                />
              </div>

              <div className="form-group">
                <label>姓名</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={e => setFormFullName(e.target.value)}
                  placeholder="请输入您的姓名"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>性别</label>
                  <select
                    value={formGender}
                    onChange={e => setFormGender(e.target.value)}
                  >
                    <option value="">请选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                    <option value="prefer-not-to-say">不愿透露</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>出生日期</label>
                  <input
                    type="date"
                    value={formDateOfBirth}
                    onChange={e => setFormDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleProfileSave}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存个人资料'}
              </button>

              <div className="settings-divider" />

              <h4>账户操作</h4>
              <div className="account-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordForm(prev => !prev)}
                >
                  {showPasswordForm ? '取消修改密码' : '修改密码'}
                </button>
                <button className="btn btn-danger" onClick={logout}>
                  退出登录
                </button>
              </div>

              {showPasswordForm && (
                <form className="password-form" onSubmit={handleChangePassword}>
                  {passwordError && (
                    <div className="save-message error">{passwordError}</div>
                  )}
                  <div className="form-group">
                    <label>当前密码</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>新密码</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="至少6位，含大小写字母和数字"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>确认新密码</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={e =>
                        setPasswordForm(prev => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="account-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? '提交中...' : '确认修改'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cancelPasswordForm}
                      disabled={isChangingPassword}
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
              <div className="settings-divider" />

              <h4 className="danger-zone-title">🗑️ 危险区域</h4>
              <p className="danger-zone-desc">
                删除账户后将永久移除您的所有数据（血常规记录、化疗周期、提醒等），此操作不可撤销。
              </p>

              {!showDeleteConfirm ? (
                <button
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  删除我的账户
                </button>
              ) : (
                <form
                  className="delete-account-form"
                  onSubmit={handleDeleteAccount}
                >
                  {deleteError && (
                    <div className="save-message error">{deleteError}</div>
                  )}
                  <p className="delete-warn">
                    ⚠️ 请输入您的密码以确认删除账户。所有数据将永久丢失。
                  </p>
                  <div className="form-group">
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder="输入密码确认"
                      required
                    />
                  </div>
                  <div className="account-actions">
                    <button
                      type="submit"
                      className="btn btn-danger"
                      disabled={isDeletingAccount}
                    >
                      {isDeletingAccount ? '处理中...' : '确认删除账户'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                        setDeleteError('');
                      }}
                      disabled={isDeletingAccount}
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h3>通知偏好</h3>
              <p className="settings-desc">
                设置提醒通知方式，帮助您按时进行血常规检查
              </p>

              <div className="toggle-group">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">邮件通知</span>
                    <span className="toggle-desc">通过电子邮件接收提醒</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={e =>
                        setNotifications(prev => ({
                          ...prev,
                          email: e.target.checked,
                        }))
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">推送通知</span>
                    <span className="toggle-desc">通过浏览器推送接收提醒</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.push}
                      onChange={e =>
                        setNotifications(prev => ({
                          ...prev,
                          push: e.target.checked,
                        }))
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleNotificationSave}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存通知设置'}
              </button>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="settings-section">
              <h3>数据与隐私</h3>
              <p className="settings-desc">管理您的健康数据共享和隐私设置</p>

              <div className="toggle-group">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">数据共享</span>
                    <span className="toggle-desc">
                      允许将血常规数据与医生共享
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={dataSharing.enabled}
                      onChange={e =>
                        setDataSharing(prev => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleDataSharingSave}
                disabled={isSaving}
              >
                {isSaving ? '保存中...' : '保存共享设置'}
              </button>

              <div className="settings-divider" />

              <div className="privacy-notice">
                <h5>🔒 隐私说明</h5>
                <p>
                  您的健康数据已加密存储。只有您本人可以访问和修改您的数据。
                  共享功能允许您生成只读链接，医生可通过该链接查看您的数据。
                  您可以随时撤销共享权限。
                </p>
              </div>

              <SharesSection sharingEnabled={dataSharing.enabled} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <AuditLogSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
