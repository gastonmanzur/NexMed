import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '@starter/ui';

export const HomePage = (): ReactElement => {
  const { t, i18n } = useTranslation();

  return (
    <main style={{ maxWidth: 960, margin: '2rem auto', padding: '1rem' }}>
      <Card title={t('home.title')}>
        <p>{t('home.subtitle')}</p>
        <button type="button" onClick={() => i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es')}>
          {t('home.switchLanguage')}
        </button>
        <p>
          <Link to="/register">Register</Link> | <Link to="/login">Login</Link> | <Link to="/dashboard">Dashboard</Link>
        </p>
      </Card>
    </main>
  );
};
