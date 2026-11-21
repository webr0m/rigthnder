import { recordAudit } from './moderation.mjs';

export function refreshSuspensions(db, now = Date.now()) {
  if (
    !db
      .prepare(
        `SELECT 1 FROM users WHERE moderation_status='suspended'
    AND moderation_until<=? LIMIT 1`,
      )
      .get(now)
  )
    return;
  db.exec('BEGIN IMMEDIATE');
  try {
    const expired = db
      .prepare(
        `UPDATE users SET moderation_status='active',moderation_until=NULL,moderation_note=''
      WHERE moderation_status='suspended' AND moderation_until<=? RETURNING id`,
      )
      .all(now);
    for (const user of expired)
      recordAudit(db, {
        actorId: 'system',
        targetId: user.id,
        action: 'suspension_expired',
        fromStatus: 'suspended',
        toStatus: 'active',
        reason: 'La suspensión temporal llegó a su fecha de vencimiento.',
      });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function assertAccountAccess(user) {
  if (!user) throw Object.assign(new Error('Inicia sesión para continuar.'), { status: 401 });
  if (user.moderation_status !== 'active')
    throw Object.assign(new Error('Tu acceso está restringido. Contacta con soporte.'), {
      status: 403,
      code: 'ACCOUNT_RESTRICTED',
    });
  if (user.email_verification_required && !user.email_verified_at)
    throw Object.assign(new Error('Confirma tu correo antes de iniciar sesión.'), {
      status: 403,
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
}
