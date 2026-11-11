import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './auth-pages.css';

type AuthPageShellProps = {
  mode: 'login' | 'register';
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthPageShell({ mode, title, description, children }: AuthPageShellProps) {
  return (
    <div className={`at-auth-page at-auth-page--${mode}`}>
      <section className="at-auth-shell" aria-label={title}>
        <aside className="at-auth-story">
          <img
            src="/images/screen12-1280.webp"
            alt=""
            className="at-auth-story-image"
            loading="eager"
            decoding="async"
          />
          <div className="at-auth-story-content">
            <span className="at-auth-eyebrow">ARCHITECH / MINECRAFT</span>
            <div>
              <h2>Создавай то, что останется.</h2>
              <p>Фабрики, дирижабли и магия в мире, который строим вместе.</p>
            </div>
            <span className="at-auth-story-footnote">ARCHITECH MC / COMMUNITY</span>
          </div>
        </aside>

        <div className="at-auth-content">
          <div className="at-auth-topline">
            <Link to="/" className="at-auth-back"><span aria-hidden="true">←</span> На главную</Link>
            <span>ARCHITECH / ACCOUNT</span>
          </div>
          <div className="at-auth-form-area">
            <div className="at-auth-heading">
              <span className="at-auth-eyebrow">{mode === 'login' ? 'С ВОЗВРАЩЕНИЕМ' : 'НОВЫЙ АККАУНТ'}</span>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {children}
          </div>
          <div className="at-auth-bottomline">ARCHITECH MC <span aria-hidden="true">·</span> МИР БЕЗ ВАЙПОВ</div>
        </div>
      </section>
    </div>
  );
}
