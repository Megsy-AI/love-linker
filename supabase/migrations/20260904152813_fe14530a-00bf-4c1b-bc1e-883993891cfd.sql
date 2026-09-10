create unique index if not exists video_models_slug_key on public.video_models (slug);

insert into public.video_models
 (slug, display_name, provider, description, endpoint_text_to_video, endpoint_image_to_video, unit,
  cost_per_video_usd, credits_per_video, supported_aspects, supported_resolutions, supported_durations,
  default_aspect, default_resolution, default_duration, is_premium, is_new, is_featured, sort_order, model_id_api, supports_audio, max_input_images)
values
 ('deapi-ltx-video','Megsy Free Video','deapi','Free video generation — no credits used.','t2v','i2v','video',0,0,'["16:9","9:16","1:1"]','["480p"]','[4]','16:9','480p',4,false,false,true,1,'Ltxv_13B_0_9_8_Distilled_FP8',false,1),
 ('renderful-google-veo-3.1','Veo 3.1','google','Google Veo 3.1 — cinematic video with native audio.','t2v','i2v','video',2.82,300,'["16:9","9:16"]','["720p","1080p"]','[4,6,8]','16:9','720p',8,true,true,true,2,'google-veo-3.1',true,1),
 ('renderful-google-veo-3.1-fast','Veo 3.1 Fast','google','Faster, cheaper Veo 3.1 with audio.','t2v','i2v','video',1.06,120,'["16:9","9:16"]','["720p","1080p"]','[4,6,8]','16:9','720p',8,true,true,true,3,'google-veo-3.1-fast',true,1),
 ('renderful-sora-2','Sora 2','openai','OpenAI Sora 2 — strong physics and audio.','t2v','i2v','video',0.44,150,'["16:9","9:16"]','["720p"]','[4,8,12,16,20]','16:9','720p',8,true,true,true,4,'sora-2',true,1),
 ('renderful-sora-2-pro','Sora 2 Pro','openai','Sora 2 Pro — highest quality, up to 1080p.','t2v','i2v','video',1.2,220,'["16:9","9:16"]','["720p","1080p"]','[4,8,12,16,20]','16:9','1080p',8,true,true,false,5,'sora-2-pro',true,1),
 ('renderful-seedance-2.0','Seedance 2.0','bytedance','ByteDance Seedance 2.0 — up to 4K, multi-shot.','t2v','i2v','video',1.025,180,'["16:9","9:16","1:1","4:3","3:4","21:9"]','["480p","720p","1080p","4k"]','[4,5,6,8,10,12,15]','16:9','720p',5,true,true,true,6,'seedance-2.0',true,1),
 ('renderful-seedance-2.5','Seedance 2.5','bytedance','Seedance 2.5 — long clips up to 30 seconds.','t2v','i2v','video',1.575,240,'["16:9","9:16","1:1","4:3","3:4","21:9"]','["480p","720p"]','[4,5,6,8,10,12,15,20,25,30]','16:9','720p',5,true,true,false,7,'seedance-2.5',true,1),
 ('renderful-seedance-2.0-mini','Seedance 2.0 Mini','bytedance','Cheaper Seedance 2.0 for quick drafts.','t2v','i2v','video',0.5125,90,'["16:9","9:16","1:1","4:3","3:4","21:9"]','["480p","720p"]','[4,5,6,8,10,12,15]','16:9','720p',5,false,true,false,8,'seedance-2.0-mini',true,1),
 ('renderful-kling-3.0-turbo','Kling 3.0 Turbo','kling','Kling 3.0 Turbo — smooth motion, fast turnaround.','t2v','i2v','video',0.56,110,'["16:9","9:16","1:1"]','["720p","1080p"]','[3,4,5,6,8,10,12,15]','16:9','720p',5,true,true,true,9,'kling-3.0-turbo',false,1),
 ('renderful-wan-2.6','WAN 2.6','alibaba','Alibaba WAN 2.6 — reliable all-round video.','t2v','i2v','video',0.5,90,'["16:9","9:16","1:1","4:3","3:4"]','["720p","1080p"]','[5,10,15]','16:9','720p',5,false,true,false,10,'wan-2.6',true,1),
 ('renderful-hailuo-2.3','Hailuo 2.3','minimax','MiniMax Hailuo 2.3 — expressive character motion.','t2v','i2v','video',0.28,70,'["16:9","9:16","1:1"]','["768p","1080p"]','[6,10]','16:9','768p',6,false,false,false,11,'hailuo-2.3',false,1),
 ('renderful-grok-imagine-video','Grok Imagine','xai','xAI Grok Imagine — fast, playful clips.','t2v','i2v','video',0.28,70,'["16:9","9:16","1:1"]','["480p","720p"]','[4,5,6,8,10,15]','16:9','720p',6,false,true,false,12,'grok-imagine-video',false,1),
 ('renderful-pixverse-v6-t2v','PixVerse V6','pixverse','PixVerse V6 — cheap, flexible durations.','t2v','i2v','video',0.225,60,'["16:9","9:16","1:1"]','["540p","720p","1080p"]','[3,5,8,10,15]','16:9','720p',5,false,false,false,13,'pixverse-v6-t2v',false,1),
 ('renderful-runway-gen4-turbo','Runway Gen-4 Turbo','runway','Runway Gen-4 Turbo — image-to-video only.',null,'i2v','video',0.5,90,'["16:9","9:16","1:1"]','["720p"]','[5,10]','16:9','720p',5,true,false,false,14,'runway-gen4-turbo',false,1)
on conflict (slug) do update set
 display_name = excluded.display_name,
 provider = excluded.provider,
 description = excluded.description,
 endpoint_text_to_video = excluded.endpoint_text_to_video,
 endpoint_image_to_video = excluded.endpoint_image_to_video,
 unit = excluded.unit,
 cost_per_video_usd = excluded.cost_per_video_usd,
 credits_per_video = excluded.credits_per_video,
 supported_aspects = excluded.supported_aspects,
 supported_resolutions = excluded.supported_resolutions,
 supported_durations = excluded.supported_durations,
 default_aspect = excluded.default_aspect,
 default_resolution = excluded.default_resolution,
 default_duration = excluded.default_duration,
 is_premium = excluded.is_premium,
 is_new = excluded.is_new,
 is_featured = excluded.is_featured,
 sort_order = excluded.sort_order,
 model_id_api = excluded.model_id_api,
 supports_audio = excluded.supports_audio,
 is_active = true,
 updated_at = now();