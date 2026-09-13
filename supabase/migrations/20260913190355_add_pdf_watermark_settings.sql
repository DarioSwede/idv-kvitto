insert into public.app_settings (key, value, description, is_public)
values
  ('pdf_watermark_enabled', 'true'::jsonb, 'Visa en svag IDV-logotyp som bakgrund i sammanställda PDF-filer.', false),
  ('pdf_watermark_opacity', '0.04'::jsonb, 'Bakgrundslogotypens opacitet i PDF, från 0.01 till 0.15.', false)
on conflict (key) do nothing;
