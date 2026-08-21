alter table players add column if not exists full_name text;
alter table players add column if not exists avatar_url text;

update players set full_name = 'Agustin Stricker' where name = 'Stricker';
update players set full_name = 'Pilar Godina' where name = 'Pilunga';
update players set full_name = 'Octavio Solari' where name = 'Octa';
update players set full_name = 'Bautista Velázquez' where name = 'Bauti';
update players set full_name = 'Lukas Velázquez' where name = 'Negro';
update players set full_name = 'Sebastián Kisser' where name = 'Seba';
update players set full_name = 'Alex Marioni' where name = 'Alex';
update players set full_name = 'Julián Jacob' where name = 'Juli';
update players set full_name = 'Luciano Lescano' where name = 'Leskano';

-- Escudos ya disponibles (los otros quedan con el emoji hasta que lleguen).
update players set avatar_url = 'avatars/stricker.png' where name = 'Stricker';
update players set avatar_url = 'avatars/bauti.jpg' where name = 'Bauti';
update players set avatar_url = 'avatars/negro.jpeg' where name = 'Negro';
update players set avatar_url = 'avatars/seba.jpeg' where name = 'Seba';
