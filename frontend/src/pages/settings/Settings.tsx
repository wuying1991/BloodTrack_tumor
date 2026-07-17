import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth/authService';
import { ApiError } from '../../services/api/apiClient';
import { useT } from '../../i18n/useT';
import SharesSection from './components/SharesSection';
import AuditLogSection from './components/AuditLogSection';
import './Settings.css';

const Settings: React.FC = () => {
  const t = useT('settings');
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

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      showToast(t('profileUpdated'));
    } catch {
      showToast(t('updateFailed'), true);
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
      showToast(t('notificationsSaved'));
    } catch {
      showToast(t('saveFailed'), true);
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
      showToast(t('sharingSaved'));
    } catch {
      showToast(t('saveFailed'), true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('passwordMismatch'));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError(t('passwordTooShort'));
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      setPasswordError(t('passwordWeak'));
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError(t('passwordSame'));
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
      showToast(t('passwordChanged'));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setPasswordError(err.message || t('passwordChangeFailed'));
      } else {
        setPasswordError(t('passwordChangeRetry'));
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
      setDeleteError(t('deletePasswordRequired'));
      return;
    }

    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount(deletePassword);
      await logout();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message || t('deleteFailed'));
      } else {
        setDeleteError(t('deleteRetry'));
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>{t('title')}</h1>
      </div>

      {saveMessage && <div className="save-message success">{saveMessage}</div>}
      {saveError && <div className="save-message error">{saveError}</div>}

      <div className="settings-container">
        <nav className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            {t('tabProfile')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            {t('tabNotifications')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            {t('tabData')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            {t('tabSecurity')}
          </button>
        </nav>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>{t('profileSection')}</h3>

              <div className="form-group">
                <label>{t('email')}</label>
                <input type="email" value={user?.email || ''} disabled className="input-readonly" />
              </div>

              <div className="form-group">
                <label>{t('fullName')}</label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={e => setFormFullName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('gender')}</label>
                  <select value={formGender} onChange={e => setFormGender(e.target.value)}>
                    <option value="">{t('genderSelect')}</option>
                    <option value="male">{t('genderMale')}</option>
                    <option value="female">{t('genderFemale')}</option>
                    <option value="other">{t('genderOther')}</option>
                    <option value="prefer-not-to-say">{t('genderPreferNotToSay')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('dateOfBirth')}</label>
                  <input type="date" value={formDateOfBirth} onChange={e => setFormDateOfBirth(e.target.value)} />
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleProfileSave} disabled={isSaving}>
                {isSaving ? t('saving') : t('saveProfile')}
              </button>

              <div className="settings-divider" />

              <h4>{t('accountActions')}</h4>
              <div className="account-actions">
                <button className="btn btn-secondary" onClick={() => setShowPasswordForm(prev => !prev)}>
                  {showPasswordForm ? t('cancelChangePassword') : t('changePassword')}
                </button>
                <button className="btn btn-danger" onClick={logout}>
                  {t('logout')}
                </button>
              </div>

              {showPasswordForm && (
                <form className="password-form" onSubmit={handleChangePassword}>
                  {passwordError && <div className="save-message error">{passwordError}</div>}
                  <div className="form-group">
                    <label>{t('currentPassword')}</label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('newPassword')}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder={t('newPasswordPlaceholder')}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('confirmNewPassword')}</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="account-actions">
                    <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                      {isChangingPassword ? t('submitting') : t('confirmChange')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={cancelPasswordForm} disabled={isChangingPassword}>
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              )}

              <div className="settings-divider" />

              <h4 className="danger-zone-title">{t('dangerZone')}</h4>
              <p className="danger-zone-desc">{t('dangerZoneDesc')}</p>

              {!showDeleteConfirm ? (
                <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                  {t('deleteAccount')}
                </button>
              ) : (
                <form className="delete-account-form" onSubmit={handleDeleteAccount}>
                  {deleteError && <div className="save-message error">{deleteError}</div>}
                  <p className="delete-warn">{t('deleteWarn')}</p>
                  <div className="form-group">
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder={t('deletePasswordPlaceholder')}
                      required
                    />
                  </div>
                  <div className="account-actions">
                    <button type="submit" className="btn btn-danger" disabled={isDeletingAccount}>
                      {isDeletingAccount ? t('processing') : t('confirmDelete')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError(''); }}
                      disabled={isDeletingAccount}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h3>{t('notificationsSection')}</h3>
              <p className="settings-desc">{t('notificationsDesc')}</p>

              <div className="toggle-group">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">{t('emailNotification')}</span>
                    <span className="toggle-desc">{t('emailNotificationDesc')}</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={e => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">{t('pushNotification')}</span>
                    <span className="toggle-desc">{t('pushNotificationDesc')}</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.push}
                      onChange={e => setNotifications(prev => ({ ...prev, push: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleNotificationSave} disabled={isSaving}>
                {isSaving ? t('saving') : t('saveNotifications')}
              </button>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="settings-section">
              <h3>{t('dataSection')}</h3>
              <p className="settings-desc">{t('dataDesc')}</p>

              <div className="toggle-group">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">{t('dataSharing')}</span>
                    <span className="toggle-desc">{t('dataSharingDesc')}</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={dataSharing.enabled}
                      onChange={e => setDataSharing(prev => ({ ...prev, enabled: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleDataSharingSave} disabled={isSaving}>
                {isSaving ? t('saving') : t('saveSharing')}
              </button>

              <div className="settings-divider" />

              <div className="privacy-notice">
                <h5>{t('privacyNotice')}</h5>
                <p>{t('privacyDesc')}</p>
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
