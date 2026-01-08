# Inventory Mapping Checklist (Per Environment)

Gunakan checklist ini setelah menjalankan `debug_mappings.sql` untuk memastikan mapping akun persediaan dan gain/loss sudah terisi dengan benar.

## Cara menjalankan

1. Buka SQL editor pada environment yang dituju.
2. Jalankan file `debug_mappings.sql`.
3. Verifikasi hasilnya sesuai checklist di bawah.

## Checklist

### Local
- [ ] `chart_of_accounts` memiliki akun persediaan, gain, dan loss (hasil query #1 tidak kosong).
- [ ] `app_settings` terisi untuk `account_persediaan` dan akun terkait (hasil query #2 terisi).
- [ ] Mapping `app_settings` mengarah ke akun valid (hasil query #3 memiliki `mapped_account_name`).

### Staging
- [ ] `chart_of_accounts` memiliki akun persediaan, gain, dan loss (hasil query #1 tidak kosong).
- [ ] `app_settings` terisi untuk `account_persediaan` dan akun terkait (hasil query #2 terisi).
- [ ] Mapping `app_settings` mengarah ke akun valid (hasil query #3 memiliki `mapped_account_name`).

### Production
- [ ] `chart_of_accounts` memiliki akun persediaan, gain, dan loss (hasil query #1 tidak kosong).
- [ ] `app_settings` terisi untuk `account_persediaan` dan akun terkait (hasil query #2 terisi).
- [ ] Mapping `app_settings` mengarah ke akun valid (hasil query #3 memiliki `mapped_account_name`).
