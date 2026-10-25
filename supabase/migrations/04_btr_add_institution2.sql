ALTER TABLE public.btr_records
ADD COLUMN institution_id_2 bigint references public.kurum_kayit(id) on delete set null;
