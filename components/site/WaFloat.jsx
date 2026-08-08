import WaButton from './WaButton';

/** The fixed bottom-right WhatsApp button, present on every marketing page. */
export default function WaFloat() {
  return (
    <WaButton
      className="wa-float"
      aria-label="Falar com a ConversIA no WhatsApp"
      showIcon={false}
    >
      <span aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1s-.5-.2-.7.1-.8 1-1 1.2-.4.2-.7 0a8.2 8.2 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6a2 2 0 0 0 .3-.5.6.6 0 0 0 0-.5c0-.2-.7-1.7-1-2.3s-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4A3.4 3.4 0 0 0 5.8 9c0 1.5 1.1 3 1.2 3.2a12 12 0 0 0 4.7 4.1 15.6 15.6 0 0 0 1.6.6 3.8 3.8 0 0 0 1.7.1 2.8 2.8 0 0 0 1.9-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.4z" />
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
        </svg>
      </span>
      <span className="wa-float-label">Falar no WhatsApp</span>
    </WaButton>
  );
}
