import { useEffect, useRef } from "react";

type GoogleSignInButtonProps = {
  text?: "signin_with" | "signup_with";
  onCredential: (credential: string) => void;
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
            options: { theme: "outline" | "filled_blue"; size: "large"; text: "signin_with" | "signup_with"; width?: string }
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({ text = "signin_with", onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const googleId = window.google?.accounts?.id;

    if (!containerRef.current || !clientId || !googleId) return;

    containerRef.current.innerHTML = "";
    googleId.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          onCredential(response.credential);
        }
      },
    });

    googleId.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      text,
      width: "300",
    });
  }, [text, onCredential]);

  return <div ref={containerRef} />;
}
