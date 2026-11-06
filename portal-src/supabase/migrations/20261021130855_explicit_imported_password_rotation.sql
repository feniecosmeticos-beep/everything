-- Auth may update password hashes during account provisioning or maintenance.
-- Unlock imported profiles only after the authenticated password-change endpoint
-- has verified the current credential and completed Auth's password update.
drop trigger fenie_password_rotated on auth.users;
drop function fenie_private.password_rotated();
