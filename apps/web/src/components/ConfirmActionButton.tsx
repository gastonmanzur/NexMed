import type { ReactElement, ReactNode } from 'react';

export const ConfirmActionButton = ({
  confirmationMessage,
  onConfirm,
  disabled = false,
  children
}: {
  confirmationMessage: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  children: ReactNode;
}): ReactElement => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!window.confirm(confirmationMessage)) {
          return;
        }

        void onConfirm();
      }}
    >
      {children}
    </button>
  );
};
