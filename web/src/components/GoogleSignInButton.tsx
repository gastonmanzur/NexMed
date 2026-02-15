import { useEffect, useRef, useState } from "react";

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

export function GoogleSignInButton({ text = "signin_with", onCredential, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [statusMessage, setStatusMessage] = useState("Inicializando Google Sign-In...");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("VITE_GOOGLE_CLIENT_ID no está disponible; Google Sign-In no se inicializó.");
      setStatusMessage("Falta configurar Google Sign-In (VITE_GOOGLE_CLIENT_ID).");

      onError?.("Falta configurar VITE_GOOGLE_CLIENT_ID para usar Google Sign-In.");

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
    }, 200);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      if (!window.google?.accounts?.id) {
        setStatusMessage("No pudimos cargar Google Sign-In. Revisá tu conexión e intentá nuevamente.");
        onError?.("No pudimos cargar Google Sign-In. Revisá tu conexión e intentá nuevamente.");
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [text, onCredential, onError]);

  return (
    <div>
      {statusMessage && <p>{statusMessage}</p>}
      <div ref={containerRef} aria-label="Iniciar sesión con Google" />
    </div>
  );
}
