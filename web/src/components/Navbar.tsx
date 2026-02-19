import { useEffect, useMemo, useRef, useState } from "react";

import { AuthUser } from "../types";
import styles from "./Navbar.module.css";

type NavItem = { label: string; href: string };

type NavbarProps = {
  user: AuthUser;
  clinicName?: string;
  onLogout: () => void;
};

const clinicNavItems: NavItem[] = [
  { label: "Inicio", href: "/admin" },
  { label: "Turnos", href: "/admin/appointments" },
  { label: "Especialidades", href: "/admin/specialties" },
  { label: "Profesionales", href: "/admin/professionals" },
  { label: "Horarios", href: "/admin/schedules" },
];

const patientNavItems: NavItem[] = [{ label: "Mis turnos", href: "/patient" }];

function isActiveLink(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href;
}

export function Navbar({ user, clinicName, onLogout }: NavbarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuId = "main-navigation-menu";
  const pathname = window.location.pathname;

  const navItems = user.type === "clinic" ? clinicNavItems : patientNavItems;

  const userDisplayName = useMemo(() => {
    if (user.type === "clinic") {
      return clinicName || user.displayName || user.email;
    }
    return user.displayName || user.email;
  }, [clinicName, user.email, user.type]);

  const userRoleText = user.type === "clinic" ? "Consultorio/Clínica" : "Paciente";
  const avatarLetter = userDisplayName.trim().charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const onNavigate = (href: string) => {
    if (window.location.pathname !== href) {
      window.location.href = href;
    }
  };

  return (
    <header className={styles.wrapper}>
      <nav className={styles.navbar} aria-label="Navegación principal">
        <a href={user.type === "clinic" ? "/admin" : "/patient"} className={styles.brand}>
          <span className={styles.brandTitle}>NexMed</span>
          <span className={styles.brandSubtitle}>{userRoleText}</span>
        </a>

        <button
          className={styles.mobileMenuButton}
          type="button"
          aria-label="Abrir menú de navegación"
          aria-expanded={isMobileOpen}
          aria-controls={menuId}
          onClick={() => setIsMobileOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className={styles.links}>
          {navItems.map((item) => {
            const active = isActiveLink(pathname, item.href);
            return (
              <li key={item.href}>
                <a className={`${styles.link} ${active ? styles.linkActive : ""}`} href={item.href} aria-current={active ? "page" : undefined}>
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className={styles.actions} ref={dropdownRef}>
          <button
            type="button"
            className={styles.userButton}
            aria-label="Abrir menú de usuario"
            aria-expanded={isUserMenuOpen}
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
          >
            <span className={styles.avatar}>{avatarLetter}</span>
            <span className={styles.userName}>{userDisplayName}</span>
          </button>

          {isUserMenuOpen && (
            <div className={styles.dropdown} role="menu" aria-label="Opciones de usuario">
              <button type="button" className={styles.dropdownItem} role="menuitem" onClick={() => onNavigate("/profile")}>
                Perfil
              </button>
              <button type="button" className={styles.dropdownItem} role="menuitem" onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </nav>

      {isMobileOpen && <button type="button" className={styles.overlay} aria-label="Cerrar menú" onClick={() => setIsMobileOpen(false)} />}

      <div id={menuId} className={`${styles.mobileMenu} ${isMobileOpen ? styles.mobileMenuOpen : ""}`}>
        <ul className={styles.mobileLinks}>
          {navItems.map((item) => {
            const active = isActiveLink(pathname, item.href);
            return (
              <li key={item.href}>
                <a
                  className={`${styles.mobileLink} ${active ? styles.linkActive : ""}`}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
