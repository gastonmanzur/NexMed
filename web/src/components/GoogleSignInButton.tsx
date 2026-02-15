import { useEffect, useRef, useState } from "react";
import { getViteEnv, getViteEnvLength, logGoogleClientIdStatusOnce } from "../config/env";

type GoogleSignInButtonProps = {
  text?: "signin_with" | "signup_with";
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme: "outline" | "filled_blue";
              size: "large";
              text: "signin_with" | "signup_with";
              width?: string;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_WAIT_INTERVAL_MS = 200;
const GOOGLE_SCRIPT_TIMEOUT_MS = 7000;

export function GoogleSignInButton({ text = "signin_with", onCredential, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [statusMessage, setStatusMessage] = useState("Inicializando Google Sign-In...");
  const clientId = getViteEnv("VITE_GOOGLE_CLIENT_ID");

  const missingEnvMessage = (() => {
    if (clientId) {
      return "";
    }

    const baseMessage = "Falta configurar Google Sign-In. Definí VITE_GOOGLE_CLIENT_ID en web/.env.local y reiniciá `npm run dev`.";
    if (!import.meta.env.DEV) {
      return baseMessage;
    }

    return `${baseMessage} (debug: largo detectado=${getViteEnvLength("VITE_GOOGLE_CLIENT_ID")})`;
  })();

  useEffect(() => {
    logGoogleClientIdStatusOnce();

    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID no está disponible; Google Sign-In no se inicializó.");
      onError?.(missingEnvMessage);
      return;
    }

    const initializeGoogleButton = () => {
      const googleId = window.google?.accounts?.id;
      if (!containerRef.current || !googleId) return false;

      containerRef.current.innerHTML = "";
      googleId.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response.credential) {
            onError?.("No se recibió una credencial válida desde Google.");
            return;
          }
          onCredential(response.credential);
        },
      });

      googleId.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        text,
        width: "300",
        locale: "es",
      });

      googleId.prompt();
      setStatusMessage("");
      return true;
    };

    if (initializeGoogleButton()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (initializeGoogleButton()) {
        window.clearInterval(intervalId);
      }
    }, GOOGLE_SCRIPT_WAIT_INTERVAL_MS);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      if (!window.google?.accounts?.id) {
        const message = "No se pudo cargar el script de Google Sign-In. Verificá tu conexión e intentá nuevamente.";
        setStatusMessage(message);
        onError?.(message);
      }
    }, GOOGLE_SCRIPT_TIMEOUT_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [clientId, missingEnvMessage, onCredential, onError, text]);

  return (
    <div>
      {(missingEnvMessage || statusMessage) && <p>{missingEnvMessage || statusMessage}</p>}
      <div ref={containerRef} aria-label="Iniciar sesión con Google" />
    </div>
  );
}
