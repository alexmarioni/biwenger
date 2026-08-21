alter table polls drop constraint polls_poll_type_check;
alter table polls add constraint polls_poll_type_check check (poll_type in ('single', 'multi', 'text', 'autocomplete'));

update polls set poll_type = 'autocomplete'
where title in ('Primer técnico en ser echado', 'Último equipo en ganar un partido');
