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
  root.addEventListener('invalid', invalid, true);
  root.addEventListener('input', clear, true);
  root.addEventListener('change', clear, true);
  return () => {
    root.removeEventListener('invalid', invalid, true);
    root.removeEventListener('input', clear, true);
    root.removeEventListener('change', clear, true);
  };
}
