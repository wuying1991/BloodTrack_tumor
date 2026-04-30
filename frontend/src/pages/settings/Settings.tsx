import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import './Settings.css';

const Settings: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'notifications' | 'data'
  >('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const [formFirstName, setFormFirstName] = useState(user?.firstName || '');
  const [formLastName, setFormLastName] = useState(user?.lastName || '');
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

  useEffect(() => {
    if (user) {
      setFormFirstName(user.firstName || '');
      setFormLastName(user.lastName || '');
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
        firstName: formFirstName,
        lastName: formLastName,
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

              <div className="form-row">
                <div className="form-group">
                  <label>名字</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={e => setFormFirstName(e.target.value)}
                    placeholder="名"
                  />
                </div>
                <div className="form-group">
                  <label>姓氏</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={e => setFormLastName(e.target.value)}
                    placeholder="姓"
                  />
                </div>
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
                <button className="btn btn-secondary">修改密码</button>
                <button className="btn btn-danger" onClick={logout}>
                  退出登录
                </button>
              </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
