// Browser validation otherwise follows the OS language, which can differ
// from the language selected inside the app.
export function localizeFormValidation(root, translate) {
  const localized = new WeakSet();
  const clear = ({ target }) => {
    if (!localized.has(target)) return;
    target.setCustomValidity('');
    localized.delete(target);
  };
  const invalid = ({ target }) => {
    const validity = target.validity;
    if (!validity || (validity.customError && !localized.has(target))) return;
    const message = validity.valueMissing
      ? 'Completa este campo.'
      : validity.typeMismatch && target.type === 'email'
        ? 'Escribe un correo válido.'
        : 'Revisa el valor de este campo antes de continuar.';
    target.setCustomValidity(translate(message));
    localized.add(target);
  };
  // A preset button can update a controlled date/time without an input event.
  // Clear only our messages before that action or an implicit submission;
  // the browser then checks the current constraints again.
  const clearForm = ({ target }) => {
    for (const field of target.closest?.('form')?.elements || []) clear({ target: field });
  };
  const keydown = (event) => {
    if (event.key === 'Enter') clearForm(event);
  };
  root.addEventListener('invalid', invalid, true);
  root.addEventListener('input', clear, true);
  root.addEventListener('change', clear, true);
  root.addEventListener('click', clearForm, true);
  root.addEventListener('keydown', keydown, true);
  return () => {
    root.removeEventListener('invalid', invalid, true);
    root.removeEventListener('input', clear, true);
    root.removeEventListener('change', clear, true);
    root.removeEventListener('click', clearForm, true);
    root.removeEventListener('keydown', keydown, true);
  };
}
