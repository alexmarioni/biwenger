update players set avatar_url = regexp_replace(avatar_url, '\.(png|jpe?g)$', '.webp')
where avatar_url is not null;

update palmares set image_url = regexp_replace(image_url, '\.(png|jpe?g)$', '.webp')
where image_url is not null;
